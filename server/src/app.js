const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter, requireCustomHeader } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render/Railway sit behind a proxy; needed for correct rate limiting and secure cookies
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({
    origin(origin, cb) {
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  }));
  app.use(compression());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize()); // strips $ and . operators from user input
  app.use('/api', apiLimiter, requireCustomHeader, routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
