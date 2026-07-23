import { SCHEMA_VERSION, type AppData } from "./storage/types";
export function isValidBackup(value: unknown): value is AppData { if (!value || typeof value !== "object") return false; const data = value as Partial<AppData>; return data.schemaVersion === SCHEMA_VERSION && Array.isArray(data.students) && Boolean(data.settings && typeof data.settings === "object"); }
export const backupFilename = () => `donbi-backup-${new Date().toISOString().slice(0, 10)}.json`;
