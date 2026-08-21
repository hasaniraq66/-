export const FIREBASE_AUTH_LISTENER_TIMEOUT_MS = 12_000;

export interface AuthBootstrapWatchdog {
  acknowledge: () => void;
  cancel: () => void;
}

/**
 * Ensures a failure to deliver the first Firebase Auth listener event cannot
 * keep the application on its loading surface indefinitely. A later event is
 * still allowed to initialise a valid session after the fallback is shown.
 */
export function createAuthBootstrapWatchdog(
  onExpire: () => void,
  timeoutMs = FIREBASE_AUTH_LISTENER_TIMEOUT_MS,
): AuthBootstrapWatchdog {
  let settled = false;
  const timeoutId = globalThis.setTimeout(() => {
    if (settled) return;
    settled = true;
    onExpire();
  }, timeoutMs);

  const clear = () => globalThis.clearTimeout(timeoutId);

  return {
    acknowledge: () => {
      if (settled) return;
      settled = true;
      clear();
    },
    cancel: () => {
      settled = true;
      clear();
    },
  };
}
