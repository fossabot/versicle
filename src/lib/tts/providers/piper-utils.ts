import { PiperProcessSupervisor } from './PiperProcessSupervisor';

const blobs: Record<string, Blob> = {};
const supervisor = new PiperProcessSupervisor();

export const isModelCached = async (modelUrl: string): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    supervisor.send(
      { kind: "isAlive", modelUrl },
      (event: MessageEvent) => {
        if (event.data.kind === "isAlive") {
          resolve(event.data.isAlive);
        }
      },
      () => resolve(false), // error handler
      5000 // Short timeout for check
    );
  });
};

export const deleteCachedModel = (modelUrl: string, modelConfigUrl: string) => {
  if (blobs[modelUrl]) delete blobs[modelUrl];
  if (blobs[modelConfigUrl]) delete blobs[modelConfigUrl];

  supervisor.terminate();
};

export const piperGenerate = async (
  piperPhonemizeJsUrl: string,
  piperPhonemizeWasmUrl: string,
  piperPhonemizeDataUrl: string,
  workerUrl: string,
  modelUrl: string,
  modelConfigUrl: string,
  speakerId: number | undefined,
  input: string,
  onProgress: (progress: number) => void,
  onnxruntimeUrl = "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.17.1/"
): Promise<{ file: string; duration: number }> => {

  // Initialize supervisor with worker URL
  supervisor.init(workerUrl);

  // Check isAlive/cached state first to ensure clean worker if needed
  // Note: PiperProcessSupervisor doesn't automatically restart if model changed.
  // The original logic checked isAlive and restarted if false/not match.
  // We should replicate that check.

  await new Promise<void>((resolve) => {
      supervisor.send(
          { kind: "isAlive", modelUrl },
          (event) => {
              if (event.data.kind === 'isAlive') {
                  if (!event.data.isAlive) {
                      // Model not loaded, restart to be clean (as per original logic)
                      // although simply init-ing might be enough if the worker supports it,
                      // original logic was: if (!isAlive) { terminate; new Worker; }
                      // We can simulate this by terminating.
                      supervisor.terminate();
                      supervisor.init(workerUrl);
                  }
                  resolve();
              }
          },
          () => {
              // If check failed, assume restart needed
              supervisor.terminate();
              supervisor.init(workerUrl);
              resolve();
          },
          5000
      )
  });


  return new Promise((resolve, reject) => {
    supervisor.send(
      {
        kind: "init",
        input,
        speakerId,
        blobs,
        piperPhonemizeJsUrl,
        piperPhonemizeWasmUrl,
        piperPhonemizeDataUrl,
        modelUrl,
        modelConfigUrl,
        onnxruntimeUrl,
        workerUrl // Pass workerUrl so supervisor can restart if needed
      },
      (event: MessageEvent) => {
        const data = event.data;
        switch (data.kind) {
          case "output": {
            const audioBlobUrl = URL.createObjectURL(data.file);
            resolve({ file: audioBlobUrl, duration: data.duration });
            break;
          }
          case "stderr": {
            console.error(data.message);
            break;
          }
          case "fetch": {
            if (data.blob) blobs[data.url] = data.blob;
            const progress = data.blob
              ? 1
              : data.total
              ? data.loaded / data.total
              : 0;
            onProgress(Math.round(progress * 100));
            break;
          }
          case "error": {
              reject(new Error(data.error));
              break;
          }
          case "complete": {
             break;
          }
        }
      },
      (error) => {
        reject(error);
      },
      60000, // 60s timeout for generation (includes download time potentially)
      1 // Retry once
    );
  });
};
