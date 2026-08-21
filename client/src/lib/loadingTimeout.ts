export const FIREBASE_PROFILE_LOAD_TIMEOUT_MS = 15_000;
export const FIREBASE_RECORDS_LOAD_TIMEOUT_MS = 20_000;

export type LoadTimeoutError = Error & { code: 'data-load-timeout' };

export function createDataLoadTimeoutError(): LoadTimeoutError {
  return Object.assign(
    new Error('انتهت مهلة تحميل البيانات المالية من Firebase.'),
    { code: 'data-load-timeout' as const },
  );
}

/**
 * Ensures a stalled SDK request cannot leave the application permanently on
 * its loading surface. The underlying promise is not cancelled; its later
 * result is ignored by the current bootstrap sequence.
 */
export function withDataLoadTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(createDataLoadTimeoutError()), timeoutMs);

    operation.then(
      (result) => {
        globalThis.clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
