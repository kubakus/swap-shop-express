import express, { Express } from 'express';
// TODO it might be worth to change it to https later
import { Server, createServer } from 'http';
import { Database } from './common/database';
import { ApiRouter } from './routes';
import CookieParser from 'cookie-parser';
import { EmailDispatcher } from './common/email-dispatcher';

function errorCatch(error: any) {
  console.error(error);
  process.exit(1);
}

class NodeServer {
  public static run(server: NodeServer): void {
    server
      .configure()
      .then(() => server.listen())
      .catch(errorCatch);

    process.on('SIGINT', () => {
      server.stop().catch(errorCatch);
    });

    process.on('SIGTERM', () => {
      server.stop().catch(errorCatch);
    });

    process.on('unhandledRejection', errorCatch);
  }

  public constructor() {
    // Create express instance
    this.express = express();
    // Create server with express as a request listener
    this.server = createServer(this.express);
    this.port = this.normalizePort(process.env.PORT || '80');
    // Set express to listen on port
    this.express.set('port', this.port);
  }

  private express: Express;
  private server: Server;

  private database?: Database;
  private emailDispatcher?: EmailDispatcher;

  private port?: number | string;

  private listen(): void {
    this.server.listen(this.port);
    this.server.on('error', (error) => console.error('err', error));
    this.server.on('listening', () => this.onListening());
  }

  private async configure(): Promise<void> {
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
    this.express.use(CookieParser());

    this.database = await Database.init();
    this.emailDispatcher = new EmailDispatcher();

    // Recreate subscription timeout on server start
    const currentSub = await this.database.subscriptionsDb.getSubscriptions({
      state: 'AwaitingDispatch',
    });
    if (currentSub.length) {
      await this.emailDispatcher.createDispatchTimeout(this.database, currentSub[0].id);
    }

    // Pass db as a locals
    this.express.use((_req, res, next) => {
      res.locals.db = this.database;
      res.locals.emailDispatcher = this.emailDispatcher;
      next();
    });

    // Reroute calls to main router
    this.express.use('/api', await ApiRouter.create());
  }

  private async stop(): Promise<void> {
    console.info('Closing server');
    this.server.close();
    if (this.database) {
      await this.database.stop();
    }
  }

  private onListening(): void {
    const address = this.server.address();
    const type =
      typeof address === 'string' ? `pipe ${address}` : address ? `port ${address.port}` : 'null';
    console.info(`Listening on ${type}`);
  }

  private normalizePort(value: string): number | string | undefined {
    const val = Number(value);
    if (isNaN(val)) {
      return value;
    }

    if (val >= 0) {
      return val;
    }

    return undefined;
  }
}

NodeServer.run(new NodeServer());
