import { config } from './config.js';
import { closePool } from './db/index.js';
import { createApp } from './app.js';

export { createApp } from './app.js';

/** Local / container entry point. Serverless deployments import `createApp`. */
function start() {
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`StudyReel API listening on http://localhost:${config.port}`);
  });

  // Finish in-flight requests before exiting, so a deploy does not drop them.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const isEntrypoint = process.argv[1]?.includes('index');
if (isEntrypoint) start();
