const mongoose = require('mongoose');
const env = require('./env');

async function connectDB(uri = env.MONGODB_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: !env.isProd || process.env.AUTO_INDEX === 'true' });
  return mongoose.connection;
}
module.exports = { connectDB };
