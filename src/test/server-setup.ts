import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

export const TEST_PORT = 3968;
const TIMEOUT = 2 * 60 * 1000;

process.env.PORT = `${TEST_PORT}`;

let serverProcess: ChildProcessWithoutNullStreams | undefined;

function stopStreams() {
  if (!serverProcess) {
    return;
  }
  serverProcess.stdout.removeAllListeners('data');
  serverProcess.stderr.removeAllListeners('data');
  serverProcess.removeAllListeners('exit');
}

export async function startServer(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let stderr = '';
    serverProcess = spawn('node', ['dist/index.js']);

    serverProcess.stderr.on('data', (data) => (stderr += data.toString()));

    serverProcess.on('exit', (code) => {
      stopStreams();
      serverProcess = undefined;
      reject(new Error(`Failed to start server (${code}): ${stderr}`));
    });

    // eslint-disable-next-line no-undef
    let timeout: NodeJS.Timeout | undefined = setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
      }
      stopStreams();
      serverProcess = undefined;
      reject(new Error('Server failed to start within reasonable time'));
    }, TIMEOUT);

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Listening')) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = undefined;
          resolve();
        }
      }
    });
  });
}

export async function stopServer(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stopStreams();
    if (!serverProcess) {
      reject(new Error('No server process'));
      return;
    }
    serverProcess.once('exit', () => {
      resolve();
    });

    serverProcess.kill('SIGKILL');
    serverProcess = undefined;
  });
}
