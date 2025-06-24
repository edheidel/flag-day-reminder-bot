import * as http from 'http';

import { Config } from '../config/config';
import { Logger } from '../utils/Logger';

import type { HealthStatus, ISubscriberService } from '../types/types';

export class HealthService {
  private server: http.Server | null = null;

  constructor(private readonly subscriberService: ISubscriberService) {}

  start(): void {
    this.server = http.createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    this.server.listen(Config.HTTP_PORT, '0.0.0.0', () => {
      Logger.info('Health server started', { port: Config.HTTP_PORT });
    });

    this.server.on('error', (error) => {
      Logger.error('Health server error', error);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      Logger.info('Health server stopped');
    }
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.url !== '/health') {
      res.writeHead(404);
      res.end('Not Found');

      return;
    }

    try {
      const health: HealthStatus = {
        status: 'UP',
        uptime: Math.floor(process.uptime()),
        subscribers: await this.subscriberService.getSubscriberCount(),
        memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        timestamp: new Date().toISOString(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
    } catch (error) {
      Logger.error('Health check failed', error);

      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'DOWN',
        uptime: Math.floor(process.uptime()),
        subscribers: 0,
        memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        timestamp: new Date().toISOString(),
      }));
    }
  }
}
