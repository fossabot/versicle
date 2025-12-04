import ePub from 'epubjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/db';
import type { BookMetadata } from '../types/db';

const MAX_FILE_SIZE_FOR_HASH = 100 * 1024 * 1024; // 100MB limit for in-memory hashing

/**
 * Computes the SHA-256 hash of a file.
 * Handles large files by validating size limit to prevent OOM.
 *
 * @param file - The file to hash.
 * @returns The hex string representation of the hash.
 */
async function computeFileHash(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_FOR_HASH) {
     throw new Error(`File too large for hashing (${(file.size / 1024 / 1024).toFixed(2)}MB). Limit is ${MAX_FILE_SIZE_FOR_HASH / 1024 / 1024}MB.`);
  }

  // We still have to read the file for crypto.subtle.digest as it doesn't support streaming from File/Blob directly yet in all envs without FileReader loop.
  // For V1 hardening, we stick to arrayBuffer but with a size check.
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}


/**
 * Processes an EPUB file, extracting metadata and cover image, and storing it in the database.
 *
 * @param file - The EPUB file object to process.
 * @returns A Promise that resolves to the UUID of the newly created book.
 * @throws Will throw an error if the file cannot be parsed or database operations fail.
 */
export async function processEpub(file: File): Promise<string> {
  // Pass File directly to ePub.js (it supports Blob/File/ArrayBuffer/Url)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const book = (ePub as any)(file);

  await book.ready;

  const metadata = await book.loaded.metadata;

  let coverBlob: Blob | undefined;
  const coverUrl = await book.coverUrl();

  if (coverUrl) {
    try {
      const response = await fetch(coverUrl);
      coverBlob = await response.blob();
    } catch (error) {
      console.warn('Failed to retrieve cover blob:', error);
    }
  }

  // Calculate SHA-256 hash
  // We do this separately to avoid holding the buffer during ePub parsing if possible,
  // although sequentially it might still spike memory if we don't rely on garbage collection.
  // Ideally, ePub parsing and hashing could be parallel, but hashing requires reading the full file.
  // We prioritize ePub parsing success first.
  const fileHash = await computeFileHash(file);

  const bookId = uuidv4();

  const newBook: BookMetadata = {
    id: bookId,
    title: metadata.title || 'Untitled',
    author: metadata.creator || 'Unknown Author',
    description: metadata.description || '',
    addedAt: Date.now(),
    coverBlob: coverBlob,
    fileHash,
    isOffloaded: false,
  };

  const db = await getDB();

  const tx = db.transaction(['books', 'files'], 'readwrite');
  await tx.objectStore('books').add(newBook);

  // Store the File (Blob) directly instead of ArrayBuffer
  await tx.objectStore('files').add(file, bookId);
  await tx.done;

  return bookId;
}
