import firebaseConfig from '../client/firebase-applet-config.json';
import type { Express, Request, Response } from 'express';
import { storageGetSignedUrl, storagePut } from './storage';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const SAFE_NAME = /[^a-zA-Z0-9._-]+/g;

export type AttachmentUploadPayload = { dataUrl?: unknown; name?: unknown; recordType?: unknown; recordId?: unknown };
export type AttachmentStorageWriter = (path: string, data: Buffer, contentType: string) => Promise<{ key: string; url: string }>;
export type AttachmentIdentity = { uid: string; idToken: string };
export type AttachmentRecord = { userId?: unknown; attachments?: unknown };
export type AttachmentRecordReader = (identity: AttachmentIdentity, ownerUid: string, recordType: 'debt' | 'expense', recordId: string) => Promise<AttachmentRecord | null>;

async function getFirebaseIdentity(req: Request): Promise<AttachmentIdentity | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const idToken = authorization.slice('Bearer '.length).trim();
  if (!idToken) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  if (!response.ok) return null;
  const body = await response.json() as { users?: Array<{ localId?: string }> };
  const uid = body.users?.[0]?.localId;
  return uid ? { uid, idToken } : null;
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
  if ((payload.recordType !== 'debt' && payload.recordType !== 'expense') || typeof payload.recordId !== 'string' || !/^[a-zA-Z0-9_-]{3,120}$/.test(payload.recordId)) {
    return { ok: false, error: 'مرجع السجل غير صالح.' };
  }
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

function parsePreviewRequest(query: Record<string, unknown>): { ownerUid: string; recordType: 'debt' | 'expense'; recordId: string; attachmentId: string } | null {
  const { ownerUid, recordType, recordId, attachmentId } = query;
  if (typeof ownerUid !== 'string' || !/^[a-zA-Z0-9_-]{3,128}$/.test(ownerUid)) return null;
  if ((recordType !== 'debt' && recordType !== 'expense') || typeof recordId !== 'string' || !/^[a-zA-Z0-9_-]{3,120}$/.test(recordId)) return null;
  if (typeof attachmentId !== 'string' || !/^[a-zA-Z0-9_-]{3,120}$/.test(attachmentId)) return null;
  return { ownerUid, recordType, recordId, attachmentId };
}

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const field = value as Record<string, unknown>;
  if (typeof field.stringValue === 'string') return field.stringValue;
  if (typeof field.integerValue === 'string' || typeof field.integerValue === 'number') return Number(field.integerValue);
  if (typeof field.doubleValue === 'number') return field.doubleValue;
  if (typeof field.booleanValue === 'boolean') return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.arrayValue && typeof field.arrayValue === 'object') {
    const values = (field.arrayValue as { values?: unknown[] }).values ?? [];
    return values.map(decodeFirestoreValue);
  }
  if (field.mapValue && typeof field.mapValue === 'object') {
    const fields = (field.mapValue as { fields?: Record<string, unknown> }).fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return undefined;
}

export const readAttachmentRecordFromFirestore: AttachmentRecordReader = async (identity, ownerUid, recordType, recordId) => {
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const collection = recordType === 'debt' ? 'debts' : 'expenses';
  const path = [ownerUid, collection, recordId].map(encodeURIComponent).join('/');
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(databaseId)}/documents/users/${path}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${identity.idToken}` } });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Firestore attachment lookup failed (${response.status})`);
  const body = await response.json() as { fields?: Record<string, unknown> };
  return Object.fromEntries(Object.entries(body.fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
};

function getAttachmentStorageKey(attachment: Record<string, unknown>, ownerUid: string, recordType: 'debt' | 'expense', recordId: string): string | null {
  const expectedPrefix = `financial-attachments/${encodeURIComponent(ownerUid)}/${recordType}/${recordId}/`;
  const storageKey = typeof attachment.storageKey === 'string'
    ? attachment.storageKey
    : typeof attachment.url === 'string' && attachment.url.startsWith('/manus-storage/')
      ? attachment.url.slice('/manus-storage/'.length)
      : '';
  return storageKey.startsWith(expectedPrefix) ? storageKey : null;
}

function isMissingStorageObject(error: unknown): boolean {
  return error instanceof Error && /(?:\(|\s)404(?:\)|\s|:)/.test(error.message);
}

export function createAttachmentPreviewHandler(dependencies: {
  getIdentity?: (req: Request) => Promise<AttachmentIdentity | null>;
  readRecord?: AttachmentRecordReader;
  signUrl?: (storageKey: string) => Promise<string>;
} = {}) {
  const getIdentity = dependencies.getIdentity ?? getFirebaseIdentity;
  const readRecord = dependencies.readRecord ?? readAttachmentRecordFromFirestore;
  const signUrl = dependencies.signUrl ?? storageGetSignedUrl;

  return async (req: Request, res: Response) => {
    try {
      const identity = await getIdentity(req);
      if (!identity) return res.status(401).json({ error: 'يجب تسجيل الدخول قبل معاينة المرفق.' });
      const previewRequest = parsePreviewRequest(req.query as Record<string, unknown>);
      if (!previewRequest) return res.status(400).json({ error: 'طلب معاينة المرفق غير صالح.' });
      const record = await readRecord(identity, previewRequest.ownerUid, previewRequest.recordType, previewRequest.recordId);
      if (!record || record.userId !== previewRequest.ownerUid || !Array.isArray(record.attachments)) {
        return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
      }
      const attachment = record.attachments.find((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && (item as Record<string, unknown>).id === previewRequest.attachmentId);
      const storageKey = attachment && getAttachmentStorageKey(attachment, previewRequest.ownerUid, previewRequest.recordType, previewRequest.recordId);
      if (!storageKey) return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
      return res.json({ url: await signUrl(storageKey) });
    } catch (error) {
      if (isMissingStorageObject(error)) {
        return res.status(404).json({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
      }
      console.error('[Attachments] preview failed', error);
      return res.status(500).json({ error: 'تعذر فتح المرفق حالياً. حاول مجدداً.' });
    }
  };
}

export function createAttachmentUploadHandler(dependencies: { getUid?: (req: Request) => Promise<string | null>; put?: AttachmentStorageWriter; createId?: () => string; now?: () => Date } = {}) {
  const getUid = dependencies.getUid ?? getFirebaseUid;
  const put = dependencies.put ?? storagePut;
  const createId = dependencies.createId ?? (() => crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());

  return async (req: Request, res: Response) => {
    try {
      const uid = await getUid(req);
      if (!uid) return res.status(401).json({ error: 'يجب تسجيل الدخول قبل رفع مرفق.' });
      const validated = validateAttachmentUpload(req.body as AttachmentUploadPayload);
      if (!validated.ok) return res.status(400).json({ error: validated.error });
      const attachmentId = createId();
      const stored = await put(buildAttachmentStoragePath(uid, validated.recordType, validated.recordId, validated.safeName), validated.data, validated.mimeType);
      return res.json({ id: attachmentId, name: validated.name, url: buildAttachmentPreviewPath(uid, validated.recordType, validated.recordId, attachmentId), storageKey: stored.key, mimeType: validated.mimeType, size: validated.data.length, uploadedAt: now().toISOString() });
    } catch (error) {
      console.error('[Attachments] upload failed', error);
      return res.status(500).json({ error: 'تعذر حفظ المرفق حالياً. حاول مجدداً.' });
    }
  };
}

export function registerAttachmentRoutes(app: Express) {
  app.post('/api/attachments/upload', createAttachmentUploadHandler());
  app.get('/api/attachments/preview', createAttachmentPreviewHandler());
}
