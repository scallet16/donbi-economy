import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: [{ find: /^@\//, replacement: `${path.resolve(__dirname, ".").replaceAll("\\", "/")}/` }] },
  test: { environment: "jsdom", exclude: ["**/node_modules/**", "**/_workspace-conflict-backup/**"] },
});
