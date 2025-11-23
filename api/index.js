import { createApp, createPoolFromEnv, ensureSchema } from "../server/src/server.js";

let cachedApp;

async function getApp() {
  if (!cachedApp) {
    const pool = createPoolFromEnv();
    await ensureSchema(pool);
    cachedApp = createApp(pool, { allowedOrigins: process.env.ALLOWED_ORIGINS || "*" });
  }
  return cachedApp;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
