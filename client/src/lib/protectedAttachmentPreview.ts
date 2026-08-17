export type AttachmentPreviewResponse = {
  url?: string;
  requiresAuthorization?: boolean;
  error?: string;
};

export type ResolvedAttachmentPreview = {
  url: string;
  revoke: () => void;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Resolves an application-authorised attachment preview. Firebase Storage reads
 * remain protected by the caller's ID token, then become a short-lived browser
 * Blob URL for <img>, <iframe>, or a new tab. Forge signed URLs are returned as-is.
 */
export async function resolveProtectedAttachmentPreview(
  previewEndpoint: string,
  idToken: string,
  fetcher: Fetcher = fetch,
  createObjectUrl: (blob: Blob) => string = URL.createObjectURL,
  revokeObjectUrl: (url: string) => void = URL.revokeObjectURL,
): Promise<ResolvedAttachmentPreview> {
  const response = await fetcher(previewEndpoint, { headers: { Authorization: `Bearer ${idToken}` } });
  const body = await response.json() as AttachmentPreviewResponse;
  if (!response.ok || !body.url) throw new Error(body.error || 'تعذر فتح المرفق.');

  if (!body.requiresAuthorization) return { url: body.url, revoke: () => undefined };

  const fileResponse = await fetcher(body.url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!fileResponse.ok) throw new Error('تعذر تنزيل المرفق المصرح به.');
  const objectUrl = createObjectUrl(await fileResponse.blob());
  return { url: objectUrl, revoke: () => revokeObjectUrl(objectUrl) };
}
