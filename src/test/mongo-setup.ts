import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { stderr } from 'process';

process.env.MONGO_URI = 'mongodb://localhost:27018';
process.env.DB_NAME = 'test';
process.env.SECRET_KEY = 'test_secret_key';

delete process.env.SWAPSHOP_EMAIL_PASSWORD;
delete process.env.SWAPSHOP_EMAIL;

let mongoProcess: ChildProcessWithoutNullStreams;

const TIMEOUT = 1000 * 60 * 2;

export async function startMongoDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let errorStream = '';

    mongoProcess = spawn('docker-compose', [
      '-p',
      'swapshop-db-api-test',
      '-f',
      'dev/test/docker-compose.yml',
      'up',
    ]);

    mongoProcess.stderr.on('data', (data) => (errorStream += data.toString()));

    const stopStreams = () => {
      mongoProcess.stdout.removeAllListeners('data');
      mongoProcess.stderr.removeAllListeners('data');
      mongoProcess.removeAllListeners('exit');
    };

    mongoProcess.on('exit', (code) => {
      stopStreams();
      reject(new Error(`Failed to start test mongo db (${code}): ${stderr}`));
    });

    const timeout = setTimeout(() => {
      stopStreams();
      mongoProcess.kill('SIGKILL');
      reject(new Error('Test Mongo failed to start within reasonable time'));
    }, TIMEOUT);

    mongoProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Waiting for connections')) {
        clearTimeout(timeout);
        stopStreams();
        resolve();
      }
    });
  });
}

export async function stopMongoDb(): Promise<void> {
  return new Promise<void>((resolve) => {
    mongoProcess.once('exit', () => {
      resolve();
    });
    mongoProcess.kill('SIGKILL');
  });
}
