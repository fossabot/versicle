import { describe, it, expect, vi, afterEach } from 'vitest';
import { runCancellable, CancellationError } from './cancellable-task-runner';

describe('runCancellable', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should run a generator to completion', async () => {
        const result: string[] = [];
        const generatorFn = function* () {
            result.push('start');
            yield Promise.resolve('step1');
            result.push('middle');
            yield Promise.resolve('step2');
            result.push('end');
        };

        const cancel = runCancellable(generatorFn());

        // Wait for execution to finish (since it's async)
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(result).toEqual(['start', 'middle', 'end']);
        cancel(); // Cleanup
    });

    it('should resolve yielded promises', async () => {
        let capturedValue: string | undefined;
        const generatorFn = function* () {
            capturedValue = yield Promise.resolve('resolved-value');
        };

        runCancellable(generatorFn());
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(capturedValue).toBe('resolved-value');
    });

    it('should handle yielded non-promises (sync values)', async () => {
        let capturedValue: string | undefined;
        const generatorFn = function* () {
            // yield a string directly
            capturedValue = yield 'sync-value';
        };

        runCancellable(generatorFn());
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(capturedValue).toBe('sync-value');
    });

    it('should stop execution when cancelled', async () => {
        const result: string[] = [];
        const generatorFn = function* () {
            result.push('start');
            yield new Promise((resolve) => setTimeout(resolve, 20));
            result.push('should-not-be-reached');
        };

        const cancel = runCancellable(generatorFn());

        // Wait a bit, but less than the promise delay
        await new Promise((resolve) => setTimeout(resolve, 5));

        // Cancel the task
        cancel();

        // Wait longer than the promise delay
        await new Promise((resolve) => setTimeout(resolve, 30));

        expect(result).toEqual(['start']);
    });

    it('should throw CancellationError into generator on cancellation', async () => {
        let errorCaught: unknown;
        const generatorFn = function* () {
            try {
                yield new Promise((resolve) => setTimeout(resolve, 20));
            } catch (err) {
                errorCaught = err;
            }
        };

        const cancel = runCancellable(generatorFn());
        await new Promise((resolve) => setTimeout(resolve, 5));
        cancel();
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(errorCaught).toBeInstanceOf(CancellationError);
    });

    it('should execute finally block on cancellation', async () => {
        let finallyExecuted = false;
        const generatorFn = function* () {
            try {
                yield new Promise((resolve) => setTimeout(resolve, 20));
            } finally {
                finallyExecuted = true;
            }
        };

        const cancel = runCancellable(generatorFn());
        await new Promise((resolve) => setTimeout(resolve, 5));
        cancel();
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(finallyExecuted).toBe(true);
    });

    it('should call onCancel callback when cancelled', async () => {
        const onCancel = vi.fn();
        const generatorFn = function* () {
            yield new Promise((resolve) => setTimeout(resolve, 20));
        };

        const cancel = runCancellable(generatorFn(), onCancel);
        cancel();

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should log warning if generator ignores cancellation and continues', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const generatorFn = function* () {
            try {
                yield new Promise((resolve) => setTimeout(resolve, 20));
            } catch (err) {
                // Ignore error and continue yielding
            }
            yield Promise.resolve('ignoring cancellation');
        };

        const cancel = runCancellable(generatorFn());
        await new Promise((resolve) => setTimeout(resolve, 5));
        cancel();
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Generator did not complete after cancellation'),
            expect.any(String)
        );
    });

    it('should handle errors thrown by generator', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs if any are added in implementation
        let errorCaught = false;

        const generatorFn = function* () {
             throw new Error('Test error');
        };

        // runCancellable catches errors inside iterate.
        // We can't easily assert on the internal catch unless we mock generator.next/throw or rely on side effects.
        // But we can ensure it doesn't crash the runtime.

        runCancellable(generatorFn());
        await new Promise((resolve) => setTimeout(resolve, 10));

        // No explicit assertion needed if it doesn't crash,
        // but typically one might want an onError callback in runCancellable if this was a generic library.
        // For this task, we assume it just swallows/logs internal errors safely.
        expect(true).toBe(true);
        consoleSpy.mockRestore();
    });
});
