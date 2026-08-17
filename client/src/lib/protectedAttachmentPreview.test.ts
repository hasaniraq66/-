import { describe, expect, it, vi } from 'vitest';
import { resolveProtectedAttachmentPreview } from './protectedAttachmentPreview.js';

describe('resolveProtectedAttachmentPreview', () => {
  it('downloads Firebase content with the authenticated user token and returns a revocable Blob URL', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'https://firebasestorage.googleapis.com/private-file', requiresAuthorization: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob(['receipt'], { type: 'image/webp' }), { status: 200 }));
    const createObjectUrl = vi.fn().mockReturnValue('blob:receipt-preview');
    const revokeObjectUrl = vi.fn();

    const preview = await resolveProtectedAttachmentPreview('/api/attachments/preview?attachmentId=att-1', 'firebase-id-token', fetcher, createObjectUrl, revokeObjectUrl);

    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/attachments/preview?attachmentId=att-1', { headers: { Authorization: 'Bearer firebase-id-token' } });
    expect(fetcher).toHaveBeenNthCalledWith(2, 'https://firebasestorage.googleapis.com/private-file', { headers: { Authorization: 'Bearer firebase-id-token' } });
    expect(preview.url).toBe('blob:receipt-preview');
    preview.revoke();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:receipt-preview');
  });

  it('keeps a non-Firebase signed URL unchanged without a second request', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: 'https://storage.example/signed' }), { status: 200 }));

    const preview = await resolveProtectedAttachmentPreview('/api/attachments/preview', 'firebase-id-token', fetcher);

    expect(preview.url).toBe('https://storage.example/signed');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
