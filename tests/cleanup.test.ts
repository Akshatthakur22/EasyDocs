/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { db, cleanSessionData, scheduleSessionCleanup, cancelSessionCleanup, cleanupExpiredData } from "@/lib/database";

describe("Session cleanup and retention policy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules cleanup timestamp 3 minutes in the future by default", async () => {
    const updateSpy = vi.spyOn(db.batches as any, "update").mockResolvedValue(1);
    const now = Date.now();
    const expiresAt = await scheduleSessionCleanup("batch-123");

    expect(expiresAt).toBeGreaterThanOrEqual(now + 179000);
    expect(expiresAt).toBeLessThanOrEqual(now + 181000);
    expect(updateSpy).toHaveBeenCalledWith("batch-123", { cleanupExpiresAt: expiresAt });
  });

  it("cancels scheduled cleanup when requested", async () => {
    const updateSpy = vi.spyOn(db.batches as any, "update").mockResolvedValue(1);
    await cancelSessionCleanup("batch-123");

    expect(updateSpy).toHaveBeenCalledWith("batch-123", { cleanupExpiresAt: undefined });
  });

  it("purges session batch, rows, and assets while leaving saved templates untouched", async () => {
    const deletedRowBatches: string[] = [];
    const deletedAssetBatches: string[] = [];
    const deletedBatches: string[] = [];

    vi.spyOn(db as any, "transaction").mockImplementation(async (...args: any[]) => {
      const fn = args[args.length - 1];
      return await fn();
    });

    vi.spyOn(db.rows as any, "where").mockImplementation(((col: any) => ({
      equals: (val: string) => ({
        delete: async () => {
          if (col === "batchId") deletedRowBatches.push(val);
        },
      }),
    })) as any);

    vi.spyOn(db.assets as any, "where").mockImplementation(((col: any) => ({
      equals: (val: string) => ({
        delete: async () => {
          if (col === "batchId") deletedAssetBatches.push(val);
        },
      }),
    })) as any);

    vi.spyOn(db.batches as any, "delete").mockImplementation((async (id: any) => {
      deletedBatches.push(String(id));
    }) as any);

    const templateDeleteSpy = vi.spyOn(db.templates as any, "delete");

    await cleanSessionData("batch-to-clean");

    expect(deletedRowBatches).toContain("batch-to-clean");
    expect(deletedAssetBatches).toContain("batch-to-clean");
    expect(deletedBatches).toContain("batch-to-clean");

    // Templates must NEVER be deleted during session cleanup
    expect(templateDeleteSpy).not.toHaveBeenCalled();
  });

  it("cleans expired session batches on startup while preserving non-expired sessions and templates", async () => {
    const now = Date.now();

    // Mock 7-day retention query: no old batches
    vi.spyOn(db.batches as any, "where").mockReturnValue({
      below: () => ({ primaryKeys: async () => [] }),
    });

    // Mock session expiry filter: batch-expired is past its 3-minute delay
    vi.spyOn(db.batches as any, "filter").mockImplementation(((predicate: any) => ({
      primaryKeys: async () => {
        const mockBatches = [
          { id: "batch-expired", cleanupExpiresAt: now - 5000 },
          { id: "batch-active", cleanupExpiresAt: now + 120000 },
          { id: "batch-no-timer" },
        ];
        return mockBatches.filter(predicate).map((b) => b.id);
      },
    })) as any);

    const deletedBatches: string[] = [];
    vi.spyOn(db.batches as any, "delete").mockImplementation((async (id: any) => {
      deletedBatches.push(String(id));
    }) as any);

    vi.spyOn(db.rows as any, "where").mockReturnValue({
      equals: () => ({ delete: async () => {} }),
    });

    vi.spyOn(db.assets as any, "where").mockReturnValue({
      equals: () => ({ delete: async () => {} }),
    });

    vi.spyOn(db.templates as any, "where").mockReturnValue({
      below: () => ({ delete: async () => 0 }),
    });

    await cleanupExpiredData();

    expect(deletedBatches).toContain("batch-expired");
    expect(deletedBatches).not.toContain("batch-active");
    expect(deletedBatches).not.toContain("batch-no-timer");
  });

  it("is idempotent and handles repeated cleanup safely without error", async () => {
    vi.spyOn(db as any, "transaction").mockImplementation(async (...args: any[]) => {
      const fn = args[args.length - 1];
      return await fn();
    });

    vi.spyOn(db.rows as any, "where").mockReturnValue({
      equals: () => ({ delete: async () => {} }),
    });

    vi.spyOn(db.assets as any, "where").mockReturnValue({
      equals: () => ({ delete: async () => {} }),
    });

    vi.spyOn(db.batches as any, "delete").mockResolvedValue(undefined);

    // Calling cleanSessionData multiple times sequentially must succeed cleanly
    await expect(cleanSessionData("batch-1")).resolves.not.toThrow();
    await expect(cleanSessionData("batch-1")).resolves.not.toThrow();
  });
});
