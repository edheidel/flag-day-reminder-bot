import * as http from 'http';
import { Server } from 'http';
import { DateTime } from 'luxon';
import { ISubscriberService, IService, type HealthCheckResult } from '../types/types';
import { Logger } from '../utils/Logger';
import { Config } from '../config/Config';

export class HttpServerService implements IService {
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

        Promise.resolve().then(() => {
          this.handleRequest(req, res);
        }).catch((error) => {
          Logger.error('Request handling error', error as Error);
          this.sendResponse(res, 500, 'Internal Server Error');
        });
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        const addr = this.server!.address() as { address: string; port: number } | null;
        const host = addr?.address || '0.0.0.0';

        Logger.info(`HTTP server started http://${host}:${this.port}/admin`, { host, port: this.port });
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

    // Close all active connections
    for (const connection of this.activeConnections) {
      connection.end();
    }

    return new Promise((resolve) => {
      const server = this.server!; // Save reference to avoid null check
      const timeout = setTimeout(() => {
        Logger.error('Force closing HTTP server due to timeout'); // Changed from warn to error
        server.close();
        resolve();
      }, Config.SHUTDOWN_TIMEOUT);

      server.close(() => {
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

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    Logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      pathname: url.pathname,
      headers: req.headers,
    });

    switch (url.pathname) {
      case '/health':
        this.handleHealthCheck(res);
        break;
      case '/admin':
        this.handleAdminPanel(res);
        break;
      default:
        this.sendResponse(res, 404, 'Not Found');
    }
  }

  private handleHealthCheck(res: http.ServerResponse): void {
    try {
      const subscriberCount = this.subscriberService.getSubscriberCount();
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

  private handleAdminPanel(res: http.ServerResponse): void {
    try {
      const subscriberCount = this.subscriberService.getSubscriberCount();
      const subscribers = this.subscriberService.getAllSubscribers();
      const addr = this.server?.address() as { address: string; port: number } | null;
      const listeningAddress = addr ? `${addr.address}:${addr.port}` : 'unknown';

      const html = this.generateAdminHtml(subscribers, subscriberCount, listeningAddress);

      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(html),
      });
      res.end(html);
    } catch (error) {
      Logger.error('Failed to generate admin panel', error as Error);
      this.sendResponse(res, 500, 'Internal Server Error');
    }
  }

  private generateAdminHtml(subscribers: number[], count: number, listeningAddress: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Flag Bot Admin</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f7f6; color: #333; }
        .container { max-width: 800px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c5e3a; text-align: center; }
        .stats { background: #e8f5e9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #4CAF50; }
        .stats h2 { margin-top: 0; color: #2e7d32; }
        .chat-id { font-family: monospace; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; margin: 0 4px; display: inline-block; }
        h2 { color: #2c5e3a; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        code { background: #eee; padding: 2px 5px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🇱🇻 Flag Day Reminder Bot - Admin Panel</h1>
        <div class="stats">
          <h2>Current Status</h2>
          <p><strong>Total Subscribers:</strong> ${count}</p>
          <p><strong>Subscriber Chat IDs:</strong> 
            ${subscribers.length > 0 ? subscribers.map((id) => `<span class="chat-id">${id}</span>`).join(', ') : '<em>None yet</em>'}
          </p>
          <p><strong>Listening on:</strong> <code>${listeningAddress}</code></p>
          <p><strong>Server Time (Riga):</strong> ${DateTime.now().setZone('Europe/Riga').toLocaleString(DateTime.DATETIME_FULL)}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }
}
