/**
 * Runs a generator function that yields Promises, allowing for the execution flow to be cancelled.
 *
 * ## Why use this pattern?
 * Standard async/await functions in JavaScript cannot be easily cancelled from the outside.
 * Once an async function starts awaiting a promise, it will continue to execute the subsequent lines
 * when the promise resolves, even if the result is no longer needed (e.g., a React component unmounted,
 * or a new request superseded the old one).
 *
 * Common workarounds involve manually checking an `isCancelled` boolean after every `await`:
 *
 * ```ts
 * const load = async () => {
 *   const data = await fetchData();
 *   if (isCancelled) return; // Manual check
 *   const processed = await processData(data);
 *   if (isCancelled) return; // Manual check
 *   setState(processed);
 * }
 * ```
 *
 * This pattern is error-prone and verbose. The `runCancellable` utility automates this check.
 * By using a generator, the runner controls the resumption of execution. If the task is cancelled,
 * the runner simply stops calling `generator.next()`, preventing any further code in the generator
 * from executing.
 *
 * ## Usage Example
 *
 * ```ts
 * import { runCancellable } from './cancellable-task-runner';
 *
 * useEffect(() => {
 *   // Define your logic as a generator
 *   const loadData = function* (id: string) {
 *      setIsLoading(true);
 *      try {
 *        // Use `yield` instead of `await`
 *        const data = yield api.fetchItem(id);
 *        // If cancelled while fetching, this line is never reached.
 *        setResult(data);
 *      } finally {
 *        // Finally blocks still run if the generator completes or errors,
 *        // but usually not if it's simply abandoned (cancelled),
 *        // unless we explicitly throw/return in the runner (which this implementation simply stops).
 *        setIsLoading(false);
 *      }
 *   };
 *
 *   // Start the task
 *   const cancel = runCancellable(loadData(currentId), () => {
 *      console.log('Task was cancelled!');
 *   });
 *
 *   // Cleanup on unmount or dependency change
 *   return () => cancel();
 * }, [currentId]);
 * ```
 *
 * @param generator - The generator object (created by calling a generator function) that yields Promises.
 * @param onCancel - Optional callback invoked if the task is cancelled.
 * @returns A function that, when called, cancels the execution of the generator.
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
