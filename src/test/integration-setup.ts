import { startMongoDb } from './mongo-setup';
import { seedDb } from './seed-db';
import { startServer } from './server-setup';
require('ts-node/register');

module.exports = async () => {
  console.info('\nStarting Mongo server for integration tests...');
  await startMongoDb();
  console.info('Starting server...');
  await startServer();
  console.info('Seeding db...');
  await seedDb();
};
