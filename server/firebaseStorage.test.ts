import { describe, expect, it, vi } from 'vitest';
import { buildFirebaseStorageDownloadUrl, firebaseStoragePut } from './firebaseStorage.js';

describe('Firebase Storage fallback', () => {
  it('constructs a URL with an encoded object path and token', () => {
    const url = new URL(buildFirebaseStorageDownloadUrl('financial-attachments/owner A/receipt.pdf', 'token-12345678901234567890'));

    expect(url.hostname).toBe('firebasestorage.googleapis.com');
    expect(url.pathname).toContain('financial-attachments%2Fowner%20A%2Freceipt.pdf');
    expect(url.searchParams.get('token')).toBe('token-12345678901234567890');
  });

  it('uploads with the Firebase identity token and writes an unguessable download token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: 'financial-attachments/owner-1/expense/expense-1/receipt.pdf' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const stored = await firebaseStoragePut('financial-attachments/owner-1/expense/expense-1/receipt.pdf', Buffer.from('file'), 'application/pdf', 'firebase-id-token');

      expect(stored.key).toBe('financial-attachments/owner-1/expense/expense-1/receipt.pdf');
      expect(stored.downloadToken).toMatch(/^[a-f0-9-]{36}$/);
      expect(stored.url).toContain(`token=${stored.downloadToken}`);
      const [requestUrl, requestInit] = fetchMock.mock.calls[0];
      expect(new URL(String(requestUrl)).searchParams.get('uploadType')).toBe('media');
      expect(requestInit).toEqual(expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-id-token', 'X-Goog-Meta-FirebaseStorageDownloadTokens': stored.downloadToken }),
      }));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
