/**
 * Pure helpers for hybrid product purge (unlink → archive) and category confirm.
 */

export type PurgeError = { id: number; message: string };

export type PurgeResult = {
  deleted: number;
  archived: number;
  errors: PurgeError[];
};

export type PurgeOps = {
  unlink: (id: number) => Promise<void>;
  archive: (id: number) => Promise<void>;
};

export function confirmCategoryName(
  expectedName: string,
  providedName: string
): boolean {
  const expected = String(expectedName || "").trim().toLowerCase();
  const provided = String(providedName || "").trim().toLowerCase();
  if (!expected || !provided) return false;
  return expected === provided;
}

export async function hybridPurgeIds(
  ids: number[],
  ops: PurgeOps
): Promise<PurgeResult> {
  const result: PurgeResult = { deleted: 0, archived: 0, errors: [] };
  for (const id of ids) {
    try {
      await ops.unlink(id);
      result.deleted += 1;
      continue;
    } catch (unlinkErr) {
      try {
        await ops.archive(id);
        result.archived += 1;
      } catch (archiveErr) {
        const message =
          archiveErr instanceof Error
            ? archiveErr.message
            : unlinkErr instanceof Error
              ? unlinkErr.message
              : "purge_failed";
        result.errors.push({ id, message });
      }
    }
  }
  return result;
}

/** Hard delete only — never archives. Accumulates per-id errors. */
export async function hardPurgeIds(
  ids: number[],
  unlink: (id: number) => Promise<void>
): Promise<PurgeResult> {
  const result: PurgeResult = { deleted: 0, archived: 0, errors: [] };
  for (const id of ids) {
    try {
      await unlink(id);
      result.deleted += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unlink_failed";
      result.errors.push({ id, message });
    }
  }
  return result;
}

export function summarizePurgeResult(result: PurgeResult): string {
  return `${result.deleted} eliminados, ${result.archived} archivados, ${result.errors.length} errores`;
}

export function summarizeHardPurgeResult(result: PurgeResult): string {
  return `${result.deleted} eliminados, ${result.errors.length} errores`;
}
