
export class PiperProcessSupervisor {
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private isProcessing: boolean = false;
  private currentTask: {
    data: unknown;
    onMessage: (event: MessageEvent) => void;
    onError: (error: unknown) => void;
    timeoutId: ReturnType<typeof setTimeout> | null;
    retriesLeft: number;
  } | null = null;
  private queue: Array<{
    data: unknown;
    onMessage: (event: MessageEvent) => void;
    onError: (error: unknown) => void;
    timeoutMs: number;
    retries: number;
  }> = [];

  constructor() {}

  public init(workerUrl: string) {
    if (this.workerUrl !== workerUrl) {
      this.terminate();
      this.workerUrl = workerUrl;
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isProcessing = false;
    // We do not clear the queue, we might process it after restart?
    // But if we terminate explicitly, maybe we should clear queue?
    // For now, let's keep the queue.
  }

  public send(
    data: unknown,
    onMessage: (event: MessageEvent) => void,
    onError: (error: unknown) => void,
    timeoutMs: number = 30000,
    retries: number = 1
  ) {
    this.queue.push({ data, onMessage, onError, timeoutMs, retries });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    if (!this.workerUrl) {
      const task = this.queue.shift();
      task?.onError(new Error("Worker URL not set. Call init() first."));
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift()!;

    this.currentTask = {
      ...task,
      retriesLeft: task.retries,
      timeoutId: null
    };

    this.runCurrentTask();
  }

  private runCurrentTask() {
    if (!this.currentTask) return;

    if (!this.worker) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.worker = new Worker((this.currentTask.data as any).workerUrl || this.workerUrl!);
            this.setupWorkerListeners();
        } catch (e) {
            this.handleError(e);
            return;
        }
    }

    // Set timeout
    this.currentTask.timeoutId = setTimeout(() => {
      this.handleError(new Error("Timeout: Worker did not respond in time"));
    }, (this.currentTask.data as { timeoutMs?: number }).timeoutMs || 30000);

    // Send message
    this.worker.postMessage(this.currentTask.data);
  }

  private setupWorkerListeners() {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent) => {
      if (this.currentTask) {
        // Reset timeout on activity? Or absolute timeout?
        // Plan says "If a synthesis request takes longer than N seconds".
        // This implies total time. But download progress keeps coming.
        // Maybe we should reset timeout on every message?
        // If we possess a massive download, 30s absolute might be too short.
        // Let's reset timeout on every message to detect *hangs*.
        if (this.currentTask.timeoutId) {
            clearTimeout(this.currentTask.timeoutId);
            this.currentTask.timeoutId = setTimeout(() => {
                this.handleError(new Error("Timeout: Worker stalled"));
            }, 30000);
        }

        try {
            this.currentTask.onMessage(event);
        } catch (e) {
            console.error("Error in onMessage handler:", e);
        }

        // If the message indicates completion or fatal error that the handler handles,
        // the handler should signal us?
        // Wait, the handler provided by piperGenerate resolves the promise.
        // How does the supervisor know the task is done?

        // In piper-utils, 'output' means success, but we also wait for 'complete'?
        // Actually `resolve` is called on `output`.
        // `complete` comes after.

        if (event.data.kind === 'complete' || (event.data.kind === 'isAlive' && !event.data.isAlive)) {
             // Task finished.
             this.completeTask();
        } else if (event.data.kind === 'output') {
             // Also might be considered done, but let's wait for complete if it exists.
             // piper_worker sends 'output' then 'complete'.
        } else if (event.data.kind === 'isAlive') {
             // isAlive check is a single response.
             this.completeTask();
        }
      }
    };

    this.worker.onerror = (event) => {
      this.handleError(event);
    };

    this.worker.onmessageerror = (event) => {
      this.handleError(event);
    }
  }

  private completeTask() {
    if (this.currentTask?.timeoutId) {
      clearTimeout(this.currentTask.timeoutId);
    }
    this.currentTask = null;
    this.isProcessing = false;
    // Process next
    setTimeout(() => this.processQueue(), 0);
  }

  private handleError(error: unknown) {
    if (this.currentTask) {
      if (this.currentTask.timeoutId) {
        clearTimeout(this.currentTask.timeoutId);
      }

      console.warn("Piper Worker Error:", error);

      if (this.currentTask.retriesLeft > 0) {
        console.log(`Retrying task... (${this.currentTask.retriesLeft} retries left)`);
        this.currentTask.retriesLeft--;
        this.restartWorker();
        this.runCurrentTask();
      } else {
        this.currentTask.onError(error);
        this.completeTask();
        this.restartWorker(); // Ensure fresh worker for next task
      }
    } else {
        // Error with no active task?
        this.restartWorker();
    }
  }

  private restartWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
