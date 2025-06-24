import * as http from 'http';
import { Server } from 'http';
import { DateTime } from 'luxon';
import { ISubscriberService, HealthCheckResult } from '../types/types';
import { Logger } from '../utils/Logger';
import { Config } from '../config/config';

export class HttpServerService {
  private server: Server | null = null;
  private isShuttingDown = false;
  private activeConnections = new Set<http.ServerResponse>();

  constructor(
    private readonly port: number,
    private readonly subscriberService: ISubscriberService,
  ) {}

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.activeConnections.add(res);
        res.on('close', () => this.activeConnections.delete(res));

        if (this.isShuttingDown) {
          this.sendResponse(res, 503, 'Service is shutting down');

          return;
        }

        this.handleRequestSafe(req, res);
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        Logger.info(`HTTP server listening on port ${this.port}`, { port: this.port });
        resolve();
      });

      this.server.on('error', (error) => {
        Logger.error('HTTP server error', error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    for (const connection of this.activeConnections) {
      connection.end();
    }

    return new Promise((resolve) => {
      if (!this.server) {
        return resolve();
      }

      const timeout = setTimeout(() => {
        Logger.error('Force closing HTTP server due to timeout');
        this.server?.close();
        resolve();
      }, Config.SHUTDOWN_TIMEOUT);

      this.server.close(() => {
        clearTimeout(timeout);
        Logger.info('HTTP server closed gracefully');
        resolve();
      });
    });
  }

  private sendResponse(res: http.ServerResponse, status: number, data: string | HealthCheckResult): void {
    const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    res.writeHead(status, {
      'Content-Type': typeof data === 'string' ? 'text/plain' : 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }

  private handleRequestSafe(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Deliberately ignore the promise
    void this.handleRequest(req, res).catch((error) => {
      Logger.error('Request handling error', error as Error);
      this.sendResponse(res, 500, 'Internal Server Error');
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    if (url.pathname === '/health') {
      await this.handleHealthCheck(res);
    } else {
      this.sendResponse(res, 404, 'Not Found');
    }
  }

  private async handleHealthCheck(res: http.ServerResponse): Promise<void> {
    try {
      const subscriberCount = await this.subscriberService.getSubscriberCount();
      const timestamp = DateTime.now().setZone(Config.TIMEZONE).toISO();

      if (!timestamp) {
        Logger.error('Failed to generate timestamp');
        this.sendResponse(res, 500, 'Internal Server Error');

        return;
      }

      const health: HealthCheckResult = {
        status: 'UP',
        components: {
          server: {
            status: 'UP',
            details: {
              uptime: process.uptime(),
              activeConnections: this.activeConnections.size,
              memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            },
          },
          storage: {
            status: 'UP',
            details: {
              subscriberCount,
            },
          },
        },
        timestamp,
      };

      this.sendResponse(res, 200, health);
    } catch (error) {
      const timestamp = DateTime.now().setZone(Config.TIMEZONE).toISO();

      if (!timestamp) {
        Logger.error('Failed to generate timestamp');
        this.sendResponse(res, 500, 'Internal Server Error');

        return;
      }

      Logger.error('Health check failed', error as Error);
      const health: HealthCheckResult = {
        status: 'DOWN',
        components: {
          server: { status: 'DOWN' },
        },
        timestamp,
      };

      this.sendResponse(res, 503, health);
    }
  }
}
