import { firebaseConfig } from './firebaseConfig.js';
import { randomUUID } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { updateAttachmentReview } from '../client/src/lib/attachmentReview.js';
import type { AttachmentReviewActor, AttachmentReviewStatus, FinancialAttachment } from '../client/src/types.js';
import { firebaseStorageDownload, firebaseStoragePut } from './firebaseStorage.js';
import { isForgeStorageConfigured, storageGetSignedUrl, storagePut } from './storage.js';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const SAFE_NAME = /[^a-zA-Z0-9._-]+/g;

export type AttachmentUploadPayload = { dataUrl?: unknown; name?: unknown; recordType?: unknown; recordId?: unknown };
export type AttachmentStorageWriter = (path: string, data: Buffer, contentType: string) => Promise<{ key: string; url: string }>;
export type AttachmentIdentity = { uid: string; idToken: string; displayName?: string; email?: string };
export type AttachmentRecord = { userId?: unknown; attachments?: unknown };
export type AttachmentRecordReader = (identity: AttachmentIdentity, ownerUid: string, recordType: 'debt' | 'expense', recordId: string) => Promise<AttachmentRecord | null>;
export type AttachmentRecordWriter = (identity: AttachmentIdentity, ownerUid: string, recordType: 'debt' | 'expense', recordId: string, attachments: FinancialAttachment[]) => Promise<void>;

async function getFirebaseIdentity(req: Request): Promise<AttachmentIdentity | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const idToken = authorization.slice('Bearer '.length).trim();
  if (!idToken) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  if (!response.ok) return null;
  const body = await response.json() as { users?: Array<{ localId?: string; displayName?: string; email?: string }> };
  const user = body.users?.[0];
  return user?.localId ? {
    uid: user.localId,
    idToken,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.email ? { email: user.email } : {}),
  } : null;
}

async function getFirebaseUid(req: Request): Promise<string | null> {
  return (await getFirebaseIdentity(req))?.uid ?? null;
}

export function decodeAttachmentDataUrl(dataUrl: unknown): { data: Buffer; mimeType: string } | null {
  if (typeof dataUrl !== 'string') return null;
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const data = Buffer.from(match[2], 'base64');
  return data.length > 0 ? { data, mimeType: match[1] } : null;
}

export function validateAttachmentUpload(payload: AttachmentUploadPayload): { ok: true; data: Buffer; mimeType: string; safeName: string; name: string; recordType: 'debt' | 'expense'; recordId: string } | { ok: false; error: string } {
  const decoded = decodeAttachmentDataUrl(payload?.dataUrl);
  if (!decoded || !ALLOWED_TYPES.has(decoded.mimeType)) return { ok: false, error: 'الصيغة غير مدعومة. استخدم PDF أو JPG أو PNG أو WEBP.' };
  if (decoded.data.length > MAX_ATTACHMENT_BYTES) return { ok: false, error: 'حجم الملف أكبر من 5 ميغابايت.' };
  if ((payload.recordType !== 'debt' && payload.recordType !== 'expense') || typeof payload.recordId !== 'string' || !/^[a-zA-Z0-9_-]{3,120}$/.test(payload.recordId)) return { ok: false, error: 'مرجع السجل غير صالح.' };
  const name = typeof payload.name === 'string' ? payload.name.slice(0, 120) : 'attachment';
  const safeName = name.replace(SAFE_NAME, '_').slice(0, 100) || 'attachment';
  return { ok: true, data: decoded.data, mimeType: decoded.mimeType, safeName, name, recordType: payload.recordType, recordId: payload.recordId };
}

export function buildAttachmentStoragePath(ownerUid: string, recordType: 'debt' | 'expense', recordId: string, safeName: string): string {
  if (!ownerUid.trim()) throw new Error('معرف المالك غير صالح.');
  return `financial-attachments/${encodeURIComponent(ownerUid)}/${recordType}/${recordId}/${safeName}`;
}

export function buildAttachmentPreviewPath(ownerUid: string, recordType: 'debt' | 'expense', recordId: string, attachmentId: string): string {
  const query = new URLSearchParams({ ownerUid, recordType, recordId, attachmentId });
  return `/api/attachments/preview?${query.toString()}`;
}

function parseAttachmentReference(input: Record<string, unknown>): { ownerUid: string; recordType: 'debt' | 'expense'; recordId: string; attachmentId: string } | null {
  const { ownerUid, recordType, recordId, attachmentId } = input;
  if (typeof ownerUid !== 'string' || !/^[a-zA-Z0-9_-]{3,128}$/.test(ownerUid)) return null;
  if ((recordType !== 'debt' && recordType !== 'expense') || typeof recordId !== 'string' || !/^[a-zA-Z0-9_-]{3,120}$/.test(recordId)) return null;
  if (typeof attachmentId !== 'string' || !/^[a-zA-Z0-9_-]{3,120}$/.test(attachmentId)) return null;
  return { ownerUid, recordType, recordId, attachmentId };
}

function parsePreviewRequest(query: Record<string, unknown>) {
  return parseAttachmentReference(query);
}

function parseReviewRequest(body: unknown): ({ ownerUid: string; recordType: 'debt' | 'expense'; recordId: string; attachmentId: string } & { update: { reviewStatus?: AttachmentReviewStatus; internalNote?: string } }) | null {
  if (!body || typeof body !== 'object') return null;
  const input = body as Record<string, unknown>;
  const reference = parseAttachmentReference(input);
  if (!reference) return null;
  const update: { reviewStatus?: AttachmentReviewStatus; internalNote?: string } = {};
  if (input.reviewStatus !== undefined) {
    if (input.reviewStatus !== 'pending_review' && input.reviewStatus !== 'reviewed') return null;
    update.reviewStatus = input.reviewStatus;
  }
  if (input.internalNote !== undefined) {
    if (typeof input.internalNote !== 'string') return null;
    update.internalNote = input.internalNote;
  }
  return Object.keys(update).length > 0 ? { ...reference, update } : null;
}

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const field = value as Record<string, unknown>;
  if (typeof field.stringValue === 'string') return field.stringValue;
  if (typeof field.integerValue === 'string' || typeof field.integerValue === 'number') return Number(field.integerValue);
  if (typeof field.doubleValue === 'number') return field.doubleValue;
  if (typeof field.booleanValue === 'boolean') return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.arrayValue && typeof field.arrayValue === 'object') return ((field.arrayValue as { values?: unknown[] }).values ?? []).map(decodeFirestoreValue);
  if (field.mapValue && typeof field.mapValue === 'object') {
    const fields = (field.mapValue as { fields?: Record<string, unknown> }).fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return undefined;
}

function encodeFirestoreValue(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (value && typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).map(([key, item]) => [key, encodeFirestoreValue(item)])) } };
  return { nullValue: null };
}

export const readAttachmentRecordFromFirestore: AttachmentRecordReader = async (identity, ownerUid, recordType, recordId) => {
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const collection = recordType === 'debt' ? 'debts' : 'expenses';
  const path = [ownerUid, collection, recordId].map(encodeURIComponent).join('/');
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(databaseId)}/documents/users/${path}`, { headers: { Authorization: `Bearer ${identity.idToken}` } });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Firestore attachment lookup failed (${response.status})`);
  const body = await response.json() as { fields?: Record<string, unknown> };
  return Object.fromEntries(Object.entries(body.fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
};

export const writeAttachmentRecordToFirestore: AttachmentRecordWriter = async (identity, ownerUid, recordType, recordId, attachments) => {
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const collection = recordType === 'debt' ? 'debts' : 'expenses';
  const path = [ownerUid, collection, recordId].map(encodeURIComponent).join('/');
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(databaseId)}/documents/users/${path}?updateMask.fieldPaths=attachments&currentDocument.exists=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${identity.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { attachments: encodeFirestoreValue(attachments) } }),
  });
  if (!response.ok) throw new Error(`Firestore attachment review update failed (${response.status})`);
};

function getAttachmentStorageKey(attachment: Record<string, unknown>, ownerUid: string, recordType: 'debt' | 'expense', recordId: string): string | null {
  const expectedPrefix = `financial-attachments/${encodeURIComponent(ownerUid)}/${recordType}/${recordId}/`;
  const storageKey = typeof attachment.storageKey === 'string' ? attachment.storageKey : typeof attachment.url === 'string' && attachment.url.startsWith('/manus-storage/') ? attachment.url.slice('/manus-storage/'.length) : '';
  return storageKey.startsWith(expectedPrefix) ? storageKey : null;
}

function getAttachmentFirebaseDownloadToken(attachment: Record<string, unknown>): string | null {
  const token = attachment.storageDownloadToken;
  return typeof token === 'string' && /^[a-zA-Z0-9-]{20,128}$/.test(token) ? token : null;
}

function isMissingStorageObject(error: unknown): boolean {
  return error instanceof Error && /(?:\(|\s)404(?:\)|\s|:)/.test(error.message);
}

function getReviewActor(identity: AttachmentIdentity): AttachmentReviewActor {
  return {
    uid: identity.uid,
    displayName: identity.displayName?.trim().slice(0, 200) || identity.email?.trim().slice(0, 256) || 'مستخدم مصادق',
    ...(identity.email ? { email: identity.email.trim().slice(0, 256) } : {}),
  };
}

export function createAttachmentPreviewHandler(dependencies: {
  getIdentity?: (req: Request) => Promise<AttachmentIdentity | null>;
  readRecord?: AttachmentRecordReader;
  signUrl?: (storageKey: string) => Promise<string>;
  downloadFirebase?: (storageKey: string, downloadToken: string, idToken: string) => Promise<{ data: Buffer; contentType: string | null }>;
} = {}) {
  const getIdentity = dependencies.getIdentity ?? getFirebaseIdentity;
  const readRecord = dependencies.readRecord ?? readAttachmentRecordFromFirestore;
  const signUrl = dependencies.signUrl ?? storageGetSignedUrl;
  const downloadFirebase = dependencies.downloadFirebase ?? firebaseStorageDownload;
  return async (req: Request, res: Response) => {
    try {
      const identity = await getIdentity(req);
      if (!identity) return res.status(401).json({ error: 'يجب تسجيل الدخول قبل معاينة المرفق.' });
      const previewRequest = parsePreviewRequest(req.query as Record<string, unknown>);
      if (!previewRequest) return res.status(400).json({ error: 'طلب معاينة المرفق غير صالح.' });
      const record = await readRecord(identity, previewRequest.ownerUid, previewRequest.recordType, previewRequest.recordId);
      if (!record || record.userId !== previewRequest.ownerUid || !Array.isArray(record.attachments)) return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
      const attachment = record.attachments.find((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && (item as Record<string, unknown>).id === previewRequest.attachmentId);
      const storageKey = attachment && getAttachmentStorageKey(attachment, previewRequest.ownerUid, previewRequest.recordType, previewRequest.recordId);
      if (!storageKey) return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
      const firebaseDownloadToken = getAttachmentFirebaseDownloadToken(attachment);
      if (firebaseDownloadToken) {
        if (req.query.download === '1') {
          const file = await downloadFirebase(storageKey, firebaseDownloadToken, identity.idToken);
          res.setHeader('Content-Type', file.contentType || (typeof attachment.mimeType === 'string' ? attachment.mimeType : 'application/octet-stream'));
          res.setHeader('Cache-Control', 'private, no-store');
          return res.status(200).send(file.data);
        }
        const downloadPath = new URLSearchParams({ ownerUid: previewRequest.ownerUid, recordType: previewRequest.recordType, recordId: previewRequest.recordId, attachmentId: previewRequest.attachmentId, download: '1' });
        return res.json({ url: `/api/attachments/preview?${downloadPath.toString()}`, requiresAuthorization: true });
      }
      return res.json({ url: await signUrl(storageKey) });
    } catch (error) {
      if (isMissingStorageObject(error)) return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
      console.error('[Attachments] preview failed', error);
      return res.status(500).json({ error: 'تعذر فتح المرفق حالياً. حاول مجدداً.' });
    }
  };
}

export function createAttachmentReviewHandler(dependencies: { getIdentity?: (req: Request) => Promise<AttachmentIdentity | null>; readRecord?: AttachmentRecordReader; writeAttachments?: AttachmentRecordWriter; now?: () => Date } = {}) {
  const getIdentity = dependencies.getIdentity ?? getFirebaseIdentity;
  const readRecord = dependencies.readRecord ?? readAttachmentRecordFromFirestore;
  const writeAttachments = dependencies.writeAttachments ?? writeAttachmentRecordToFirestore;
  const now = dependencies.now ?? (() => new Date());
  return async (req: Request, res: Response) => {
    try {
      const identity = await getIdentity(req);
      if (!identity) return res.status(401).json({ error: 'يجب تسجيل الدخول قبل تحديث مراجعة المرفق.' });
      const reviewRequest = parseReviewRequest(req.body);
      if (!reviewRequest) return res.status(400).json({ error: 'طلب مراجعة المرفق غير صالح.' });
      const record = await readRecord(identity, reviewRequest.ownerUid, reviewRequest.recordType, reviewRequest.recordId);
      if (!record || record.userId !== reviewRequest.ownerUid || !Array.isArray(record.attachments)) return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية تعديله.' });
      const attachments = record.attachments as FinancialAttachment[];
      if (!attachments.some((attachment) => attachment && attachment.id === reviewRequest.attachmentId)) return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية تعديله.' });
      const updatedAttachments = updateAttachmentReview(attachments, reviewRequest.attachmentId, reviewRequest.update, now().toISOString(), getReviewActor(identity));
      await writeAttachments(identity, reviewRequest.ownerUid, reviewRequest.recordType, reviewRequest.recordId, updatedAttachments);
      return res.json({ attachments: updatedAttachments });
    } catch (error) {
      console.error('[Attachments] review update failed', error);
      return res.status(500).json({ error: 'تعذر حفظ مراجعة المرفق حالياً. حاول مجدداً.' });
    }
  };
}

export function createAttachmentUploadHandler(dependencies: { getUid?: (req: Request) => Promise<string | null>; getIdentity?: (req: Request) => Promise<AttachmentIdentity | null>; put?: AttachmentStorageWriter; createId?: () => string; now?: () => Date } = {}) {
  const getUid = dependencies.getUid ?? getFirebaseUid;
  const getIdentity = dependencies.getIdentity ?? getFirebaseIdentity;
  const put = dependencies.put ?? storagePut;
  const createId = dependencies.createId ?? randomUUID;
  const now = dependencies.now ?? (() => new Date());
  return async (req: Request, res: Response) => {
    try {
      const uid = await getUid(req);
      if (!uid) return res.status(401).json({ error: 'يجب تسجيل الدخول قبل رفع مرفق.' });
      const validated = validateAttachmentUpload(req.body as AttachmentUploadPayload);
      if (!validated.ok) return res.status(400).json({ error: validated.error });
      const attachmentId = createId();
      const storagePath = buildAttachmentStoragePath(uid, validated.recordType, validated.recordId, validated.safeName);
      const stored: { key: string; url: string; downloadToken?: string } = dependencies.put || isForgeStorageConfigured()
        ? await put(storagePath, validated.data, validated.mimeType)
        : await (async () => {
          const identity = await getIdentity(req);
          if (!identity || identity.uid !== uid) throw new Error('Firebase Storage upload identity could not be verified');
          return firebaseStoragePut(storagePath, validated.data, validated.mimeType, identity.idToken);
        })();
      return res.json({
        id: attachmentId,
        name: validated.name,
        url: buildAttachmentPreviewPath(uid, validated.recordType, validated.recordId, attachmentId),
        storageKey: stored.key,
        ...(stored.downloadToken ? { storageDownloadToken: stored.downloadToken } : {}),
        mimeType: validated.mimeType,
        size: validated.data.length,
        uploadedAt: now().toISOString(),
        reviewStatus: 'pending_review',
      });
    } catch (error) {
      console.error('[Attachments] upload failed', error);
      return res.status(500).json({ error: 'تعذر حفظ المرفق حالياً. حاول مجدداً.' });
    }
  };
}

export function registerAttachmentRoutes(app: Express) {
  app.post('/api/attachments/upload', createAttachmentUploadHandler());
  app.get('/api/attachments/preview', createAttachmentPreviewHandler());
  app.post('/api/attachments/review', createAttachmentReviewHandler());
}
