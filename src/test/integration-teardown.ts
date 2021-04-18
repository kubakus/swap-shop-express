import { stopMongoDb } from './mongo-setup';
import { stopServer } from './server-setup';

require('ts-node/register');

module.exports = async () => {
  console.info('Stopping database...');
  await stopMongoDb();
  console.info('Stopping server...');
  await stopServer();
  console.info('Done...');
};
