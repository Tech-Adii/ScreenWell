// Windows camera drivers can briefly remain busy while a previous stream is releasing.
// Retry that specific startup error once, while the same authorized request is active.
export async function acquireCamera<T>(
  acquire: () => Promise<T>,
  active: () => boolean,
  pause: (milliseconds: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  const canceled = () => new DOMException('Camera request canceled.', 'AbortError');
  if (!active()) throw canceled();
  try {
    return await acquire();
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'NotReadableError' || !active()) throw error;
    await pause(500);
    if (!active()) throw canceled();
    return acquire();
  }
}
