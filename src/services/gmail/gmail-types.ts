export interface SyncSummary {
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  failed: number;
  durationMs: number;
  historyId?: string;
  error?: string;
}
