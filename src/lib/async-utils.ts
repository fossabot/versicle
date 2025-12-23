/**
 * Runs a generator function that yields Promises.
 * Returns a cleanup function to cancel execution mid-flight.
 */
export function runCancellable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generator: Generator<Promise<any> | any, void, any>,
  onCancel?: () => void
) {
  let cancelled = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iterate = async (arg?: any) => {
    if (cancelled) return;

    try {
      const result = generator.next(arg);
      if (result.done || cancelled) return;

      // Wait for the yielded promise
      const value = await result.value;
      if (!cancelled) {
        iterate(value);
      }
    } catch (err) {
      if (!cancelled) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        generator.throw?.(err);
      }
    }
  };

  void iterate();

  return () => {
    cancelled = true;
    onCancel?.();
  };
}
