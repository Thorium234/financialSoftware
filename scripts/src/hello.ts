/**
 * Workspace health check — run with: pnpm --filter @workspace/scripts run hello
 *
 * Confirms the scripts package resolves Node.js types and can run.
 * Extend this file with seed helpers, migration runners, or data exports.
 */

const now = new Date();
console.log(`[${now.toISOString()}] @workspace/scripts — OK`);
console.log(`Node ${process.version} | Platform: ${process.platform}`);
