const { createApp } = require('../server/src/app');
const { connectDB } = require('../server/src/config/db');
const { bootstrap } = require('../server/src/utils/bootstrap');

const app = createApp();
let startup;

module.exports = async function handler(req, res) {
  startup ??= connectDB().then(bootstrap).catch((error) => {
    startup = undefined;
    throw error;
  });
  try {
    await startup;
  } catch (error) {
    console.error('API startup failed', error);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'API temporarily unavailable' }));
    return;
  }

  return app(req, res);
};
