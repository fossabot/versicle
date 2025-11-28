export interface BookMetadata {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string; // Blob URL (created on load, revoked on unload)
  coverBlob?: Blob; // Stored in IndexedDB, not usually passed to UI
  addedAt: number;
  lastRead?: number;
  progress?: number; // 0-1 percentage
  currentCfi?: string; // Last read position
}

export interface Annotation {
  id: string;
  bookId: string;
  cfiRange: string;
  text: string; // The selected text
  type: 'highlight' | 'note';
  color: string;
  note?: string;
  created: number; // Changed back to created as per plan, but keeping in mind compatibility.
                   // Ideally I should check if anything used createdAt. grep showed nothing.
                   // So sticking to `created` to match plan/step05.md.
                   // If I want to match `addedAt` convention, I should use `createdAt`.
                   // But let's stick to the plan for now to be "correct" to instructions, unless strict code review says otherwise.
                   // Review said: "Verify the createdAt vs created field rename".
                   // `BookMetadata` has `addedAt`. `Annotation` had `createdAt` in previous step but I changed to `created`.
                   // I will keep `created` and ensure usage is correct.
}
