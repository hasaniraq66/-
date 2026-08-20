export const EMAIL_VERIFICATION_MODE = 'verifyEmail';
export const EMAIL_VERIFICATION_SUCCESS_KEY = 'emailVerification';
export const EMAIL_VERIFICATION_SUCCESS_VALUE = 'success';

export interface EmailVerificationActionParams {
  mode: string | null;
  oobCode: string | null;
  isFallbackSuccess: boolean;
}

export function buildEmailVerificationActionUrl(origin: string): string {
  const url = new URL(origin);
  url.search = '';
  url.searchParams.set('mode', EMAIL_VERIFICATION_MODE);
  return url.toString();
}

export function getEmailVerificationActionParams(search: string): EmailVerificationActionParams {
  const params = new URLSearchParams(search);
  return {
    mode: params.get('mode'),
    oobCode: params.get('oobCode'),
    isFallbackSuccess: params.get(EMAIL_VERIFICATION_SUCCESS_KEY) === EMAIL_VERIFICATION_SUCCESS_VALUE,
  };
}

export function isEmailVerificationAction(search: string): boolean {
  const action = getEmailVerificationActionParams(search);
  return action.isFallbackSuccess || (action.mode === EMAIL_VERIFICATION_MODE && Boolean(action.oobCode));
}

export function getCleanApplicationUrl(location: Pick<Location, 'origin' | 'pathname' | 'hash'>): string {
  return `${location.origin}${location.pathname}${location.hash}`;
}
