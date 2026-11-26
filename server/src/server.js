const env = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const { bootstrap } = require('./utils/bootstrap');

async function main() {
  await connectDB();
  await bootstrap();
  const app = createApp();
  const server = app.listen(env.PORT, () => console.log(`CodeSprint API listening on :${env.PORT} (${env.NODE_ENV})`));

  const shutdown = (sig) => {
    console.log(`${sig} received, shutting down`);
    server.close(() => require('mongoose').connection.close().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => { console.error('Fatal startup error', err); process.exit(1); });
