import { randomUUID } from 'node:crypto';
import { firebaseConfig } from './firebaseConfig.js';

export type FirebaseStorageObject = {
  key: string;
  url: string;
  downloadToken: string;
};

export type FirebaseStorageDownload = {
  data: Buffer;
  contentType: string | null;
};

function getBucketName(): string {
  const bucket = firebaseConfig.storageBucket?.trim();
  if (!bucket) throw new Error('Firebase Storage bucket is not configured');
  return bucket;
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, '');
}

export function buildFirebaseStorageDownloadUrl(storageKey: string, downloadToken: string): string {
  const bucket = getBucketName();
  const url = new URL(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(normalizeKey(storageKey))}`);
  url.searchParams.set('alt', 'media');
  url.searchParams.set('token', downloadToken);
  return url.toString();
}

/**
 * Downloads an object from Firebase Storage on the server with the record
 * owner's ID token. Browsers then fetch the same-origin preview route, which
 * avoids opening Firebase Storage CORS rules or public download URLs.
 */
export async function firebaseStorageDownload(storageKey: string, downloadToken: string, idToken: string): Promise<FirebaseStorageDownload> {
  if (!idToken) throw new Error('Firebase Storage download requires an ID token');
  const response = await fetch(buildFirebaseStorageDownloadUrl(storageKey, downloadToken), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Firebase Storage download failed (${response.status}): ${message}`);
  }
  return {
    data: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type'),
  };
}

/**
 * Stores an attachment with the caller's Firebase ID token. This is the Vercel
 * fallback when Manus' private Forge storage environment is not injected.
 * The returned unguessable token is kept in the Firestore record and is only
 * returned by the protected preview route after checking record ownership.
 */
export async function firebaseStoragePut(storageKey: string, data: Buffer | Uint8Array, contentType: string, idToken: string): Promise<FirebaseStorageObject> {
  if (!idToken) throw new Error('Firebase Storage upload requires an ID token');
  const bucket = getBucketName();
  const key = normalizeKey(storageKey);
  const downloadToken = randomUUID();
  const uploadUrl = new URL(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o`);
  uploadUrl.searchParams.set('uploadType', 'media');
  uploadUrl.searchParams.set('name', key);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': contentType,
      'X-Goog-Meta-FirebaseStorageDownloadTokens': downloadToken,
    },
    body: new Blob([data as unknown as BlobPart], { type: contentType }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Firebase Storage upload failed (${response.status}): ${message}`);
  }

  return { key, url: buildFirebaseStorageDownloadUrl(key, downloadToken), downloadToken };
}
