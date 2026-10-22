import Dexie, { type Table } from "dexie";
import type { Batch, DataRow, SavedTemplate } from "@/lib/types";
import { LOCAL_RETENTION_DAYS } from "@/lib/types";

class EasyDocsDatabase extends Dexie {
  templates!: Table<SavedTemplate, string>;
  batches!: Table<Batch, string>;
  rows!: Table<DataRow & { batchId: string }, [string, number]>;

  constructor() {
    super("EasyDocsLocalDB");
    this.version(1).stores({
      templates: "id, updatedAt, name",
      batches: "id, createdAt, updatedAt, status, templateId",
      rows: "[batchId+id], batchId, status"
    });
  }
}

export const db = new EasyDocsDatabase();

export async function cleanupExpiredData(): Promise<void> {
  const threshold = Date.now() - LOCAL_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const expired = await db.batches.where("updatedAt").below(threshold).primaryKeys();
  for (const id of expired) {
    await db.rows.where("batchId").equals(String(id)).delete();
    await db.batches.delete(String(id));
  }
  await db.templates.where("updatedAt").below(threshold).delete();
}

export async function persistBatch(batch: Batch, rows: DataRow[]): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.batches, db.rows, async () => {
    await db.batches.put({ ...batch, updatedAt: now });
    await db.rows.where("batchId").equals(batch.id).delete();
    await db.rows.bulkPut(rows.map((row) => ({ ...row, batchId: batch.id })));
  });
}

export async function loadBatch(batchId: string): Promise<{ batch: Batch; rows: DataRow[] } | null> {
  const batch = await db.batches.get(batchId);
  if (!batch) return null;
  const rows = await db.rows.where("batchId").equals(batchId).sortBy("id");
  return { batch, rows };
}

export async function clearBatch(batchId: string): Promise<void> {
  await db.transaction("rw", db.batches, db.rows, async () => {
    await db.rows.where("batchId").equals(batchId).delete();
    await db.batches.delete(batchId);
  });
}
