// src/lib/debug.js
export const DEBUG = process.env.DEBUG_DB === "1";

export function debugLog(label, data) {
  if (!DEBUG) return;
  console.log(`[DEBUG] ${label}:`, data);
}
