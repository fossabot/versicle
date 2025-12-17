import { PiperProcessSupervisor } from './PiperProcessSupervisor';

const blobs: Record<string, Blob> = {};
const supervisor = new PiperProcessSupervisor();

export const cacheModel = (url: string, blob: Blob) => {
  blobs[url] = blob;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchWithBackoff = async (url: string, retries = 3, delay = 1000): Promise<Blob> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.blob();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch failed for ${url}, retrying in ${delay}ms...`, error);
      await wait(delay);
      return fetchWithBackoff(url, retries - 1, delay * 2);
    } else {
      throw error;
    }
  }
};

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

/**
 * Concatenates multiple WAV blobs into a single WAV blob.
 * Assumes blobs are standard WAV files (RIFF header + data chunk).
 */
export async function stitchWavs(blobs: Blob[]): Promise<Blob> {
    if (blobs.length === 0) return new Blob([], { type: 'audio/wav' });
    if (blobs.length === 1) return blobs[0];

    // Helper to find data chunk
    function findDataChunk(view: DataView): { offset: number, size: number } | null {
        // Start after RIFF header (12 bytes)
        let offset = 12;
        while (offset < view.byteLength) {
            // Read 4 chars
            const chunkId = String.fromCharCode(
                view.getUint8(offset),
                view.getUint8(offset + 1),
                view.getUint8(offset + 2),
                view.getUint8(offset + 3)
            );
            const chunkSize = view.getUint32(offset + 4, true); // little endian

            if (chunkId === 'data') {
                return { offset: offset + 8, size: chunkSize };
            }
            offset += 8 + chunkSize;
        }
        return null;
    }

    const buffers = await Promise.all(blobs.map(b => b.arrayBuffer()));
    const firstBuffer = buffers[0];
    const firstView = new DataView(firstBuffer);

    const firstData = findDataChunk(firstView);
    if (!firstData) {
        // Fallback: assume 44 byte header if parsing fails
         console.warn("Could not find data chunk in first WAV, assuming 44 byte header.");
    }

    // Header size (everything before data)
    const headerSize = firstData ? firstData.offset : 44;
    const header = firstBuffer.slice(0, headerSize);

    const dataParts: ArrayBuffer[] = [];
    let totalDataSize = 0;

    for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        const view = new DataView(buffer);
        const dataInfo = findDataChunk(view);

        if (dataInfo) {
            dataParts.push(buffer.slice(dataInfo.offset, dataInfo.offset + dataInfo.size));
            totalDataSize += dataInfo.size;
        } else {
             // Fallback: strip 44 bytes
             dataParts.push(buffer.slice(44));
             totalDataSize += (buffer.byteLength - 44);
        }
    }

    // Update Header
    const newHeader = new DataView(header.slice(0)); // copy
    // RIFF ChunkSize (at 4) = 4 + (8 + subchunks) + (8 + dataSize)
    // Simplified: FileSize - 8
    // headerSize includes the preamble (4) + size (4) + rest of header
    newHeader.setUint32(4, headerSize - 8 + totalDataSize, true);
    // Data SubchunkSize (at headerSize - 4 usually?)
    // Actually, if we found the data chunk, its size is at offset-4.
    if (firstData) {
        newHeader.setUint32(firstData.offset - 4, totalDataSize, true);
    } else {
        newHeader.setUint32(40, totalDataSize, true);
    }

    return new Blob([newHeader, ...dataParts], { type: 'audio/wav' });
}

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
): Promise<{ file: Blob; duration: number }> => {

  // Initialize supervisor with worker URL
  supervisor.init(workerUrl);

  // Validate worker state before starting generation.
  // We check if the worker is alive and has the correct model loaded.
  // If the check fails or returns false (different model loaded), we restart
  // the worker to ensure a clean state for the new generation request.
  await new Promise<void>((resolve) => {
      supervisor.send(
          { kind: "isAlive", modelUrl },
          (event) => {
              if (event.data.kind === 'isAlive') {
                  if (!event.data.isAlive) {
                      // Model not loaded or worker state mismatch.
                      // Terminate and re-initialize to force a fresh load.
                      supervisor.terminate();
                      supervisor.init(workerUrl);
                  }
                  resolve();
              }
          },
          () => {
              // If the health check times out or errors, assume the worker is
              // unresponsive and restart it.
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
            // Hardening Phase 3: Return Blob directly to avoid unrevoked ObjectURLs
            resolve({ file: data.file, duration: data.duration });
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
