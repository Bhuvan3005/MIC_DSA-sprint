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

  // Vercel may pass the rewrite destination as the request URL.
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/dispatch' && url.searchParams.has('__api_path')) {
    const path = url.searchParams.get('__api_path');
    url.searchParams.delete('__api_path');
    req.url = `/api/${path}${url.search}`;
  }
  return app(req, res);
};
