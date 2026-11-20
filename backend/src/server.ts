import { createApp } from './app.js';
import { connectDb, disconnectDb } from './db.js';
import { env } from './config/env.js';

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] PERITEC MVP listening on http://localhost:${env.port}`);
    console.log(`[api] health: http://localhost:${env.port}/api/health`);
  });
  const shutdown = async () => {
    console.log('\n[api] shutting down...');
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
