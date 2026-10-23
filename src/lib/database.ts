import Dexie, { type Table } from "dexie";
import type { Batch, DataRow, DocumentAsset, SavedTemplate } from "@/lib/types";
import { LOCAL_RETENTION_DAYS } from "@/lib/types";

class EasyDocsDatabase extends Dexie {
  templates!: Table<SavedTemplate, string>;
  batches!: Table<Batch, string>;
  rows!: Table<DataRow & { batchId: string }, [string, number]>;
  assets!: Table<DocumentAsset & { batchId: string }, string>;

  constructor() {
    super("EasyDocsLocalDB");
    this.version(1).stores({
      templates: "id, updatedAt, name",
      batches: "id, createdAt, updatedAt, status, templateId",
      rows: "[batchId+id], batchId, status",
    });
    this.version(2).stores({
      templates: "id, updatedAt, name",
      batches: "id, createdAt, updatedAt, status, templateId, cleanupExpiresAt",
      rows: "[batchId+id], batchId, status",
      assets: "id, batchId, name",
    });
  }
}

export const db = new EasyDocsDatabase();

export async function cleanupExpiredData(): Promise<void> {
  const now = Date.now();
  const threshold = now - LOCAL_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // 1. Clean batches expired by 7-day retention
  const expired = await db.batches.where("updatedAt").below(threshold).primaryKeys();
  for (const id of expired) {
    await db.rows.where("batchId").equals(String(id)).delete();
    await db.assets.where("batchId").equals(String(id)).delete();
    await db.batches.delete(String(id));
  }

  // 2. Clean temporary sessions whose post-download countdown expired (e.g. tab closed before timer fired)
  const sessionExpired = await db.batches
    .filter((b) => Boolean(b.cleanupExpiresAt && b.cleanupExpiresAt <= now))
    .primaryKeys();
  for (const id of sessionExpired) {
    await db.rows.where("batchId").equals(String(id)).delete();
    await db.assets.where("batchId").equals(String(id)).delete();
    await db.batches.delete(String(id));
  }

  // 3. Clean old templates beyond retention days
  await db.templates.where("updatedAt").below(threshold).delete();
}

export async function persistBatch(batch: Batch, rows: DataRow[], assets?: DocumentAsset[]): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.batches, db.rows, db.assets, async () => {
    await db.batches.put({ ...batch, updatedAt: now });
    await db.rows.where("batchId").equals(batch.id).delete();
    await db.rows.bulkPut(rows.map((row) => ({ ...row, batchId: batch.id })));
    if (assets) {
      await db.assets.where("batchId").equals(batch.id).delete();
      if (assets.length > 0) {
        await db.assets.bulkPut(assets.map((asset) => ({ ...asset, batchId: batch.id })));
      }
    }
  });
}

export async function saveAsset(asset: DocumentAsset, batchId: string): Promise<void> {
  await db.assets.put({ ...asset, batchId });
}

export async function deleteAsset(assetId: string): Promise<void> {
  await db.assets.delete(assetId);
}

export async function loadBatch(batchId: string): Promise<{ batch: Batch; rows: DataRow[]; assets: Record<string, DocumentAsset> } | null> {
  const batch = await db.batches.get(batchId);
  if (!batch) return null;
  const rows = await db.rows.where("batchId").equals(batchId).sortBy("id");
  const assetItems = await db.assets.where("batchId").equals(batchId).toArray();
  const assets = Object.fromEntries(assetItems.map((item) => [item.id, item]));
  return { batch: { ...batch, assets }, rows, assets };
}

export async function clearBatch(batchId: string): Promise<void> {
  await db.transaction("rw", db.batches, db.rows, db.assets, async () => {
    await db.rows.where("batchId").equals(batchId).delete();
    await db.assets.where("batchId").equals(batchId).delete();
    await db.batches.delete(batchId);
  });
}

/**
 * Purges all temporary session data (rows, assets, generated output, batch)
 * while strictly preserving saved reusable templates in db.templates.
 */
export async function cleanSessionData(batchId: string): Promise<void> {
  await clearBatch(batchId);
}

/**
 * Schedules an automatic session cleanup (e.g. 3 minutes after download initiated).
 * Stores cleanupExpiresAt on the batch record for startup resilience.
 */
export async function scheduleSessionCleanup(batchId: string, delayMs = 180000): Promise<number> {
  const cleanupExpiresAt = Date.now() + delayMs;
  await db.batches.update(batchId, { cleanupExpiresAt });
  return cleanupExpiresAt;
}

/**
 * Cancels a scheduled session cleanup countdown if the user continues working.
 */
export async function cancelSessionCleanup(batchId: string): Promise<void> {
  await db.batches.update(batchId, { cleanupExpiresAt: undefined });
}
