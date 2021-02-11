import express, { Express } from 'express';
// TODO it might be worth to change it to https later
import { Server, createServer } from 'http'
import { ApiRouter } from './routes';

function errorCatch(error: any) {
    console.error(error);
    process.exit(1);
}

class NodeServer {
    public static run(server: NodeServer): void {
        server.configure().then(
            () => server.listen()
        ).catch(errorCatch)

        process.on('SIGINT', () => {
            server.stop().catch(errorCatch)
        })

        process.on('SIGTERM', () => {
            server.stop().catch(errorCatch)
        })

        process.on('unhandledRejection', errorCatch)
    }

    public constructor() {
        // Create express instance
        this.express = express();
        // Create server with express as a request listener
        this.server = createServer(this.express);
        this.port = this.normalizePort(process.env.PORT || '80')
        // Set express to listen on port
        this.express.set('port', this.port)
    }

    private express: Express;
    private server: Server;

    private port?: number | string;

    private listen(): void {
        this.server.listen(this.port);
        this.server.on('error', (error) => console.error("err", error));
        this.server.on('listening', () => this.onListening())
    }

    private async configure(): Promise<void> {
        // Reroute calls to main router
        this.express.use('/api', await ApiRouter.createRouter())
    }
    
    private async stop(): Promise<void> {
        console.info("Closing server")
        this.server.close()
    }

    private onListening(): void {
        const address = this.server.address();
        const type = typeof address === 'string' ? `pipe ${address}` : address ? `port ${address.port}` : 'null';
        console.info(`Listening on ${type}`)
    }

    private normalizePort(value: string): number | string | undefined{ 
        const val = Number(value);
        if (isNaN(val)) {
            return value;
        }

        if (val >= 0) {
            return val
        }
        
        return undefined;
    }
}

NodeServer.run(new NodeServer());