import { base44 } from '@/api/base44Client';

const MAX_RETRIES = 3;
const CONCURRENCY_LIMIT = 3;

/**
 * Robust upload utility with retries and concurrency control.
 */
export async function robustUpload(file, onProgress) {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (result?.file_url) {
        return result.file_url;
      }
      throw new Error('Upload failed: no file_url returned');
    } catch (err) {
      attempt++;
      if (attempt === MAX_RETRIES) throw err;
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

/**
 * Upload multiple files with controlled concurrency.
 */
export async function bulkUpload(files, onProgress) {
  const results = new Array(files.length).fill(null);
  const queue = files.map((file, index) => ({ file, index }));
  let finished = 0;

  const workers = Array.from({ length: Math.min(files.length, CONCURRENCY_LIMIT) }).map(async () => {
    while (queue.length > 0) {
      const { file, index } = queue.shift();
      try {
        const url = await robustUpload(file);
        results[index] = { url, name: file.name.replace(/\.[^.]+$/, ''), success: true };
      } catch (err) {
        results[index] = { error: err.message, name: file.name, success: false };
      } finally {
        finished++;
        if (onProgress) onProgress(finished, files.length);
      }
    }
  });

  await Promise.all(workers);
  return results;
}
