import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ path: '/ws' })
export class ServersGateway {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ServersGateway');

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: any, @ConnectedSocket() client: any): void {
    this.logger.log(`Client subscribed to server: ${data.serverId}`);
    // TODO: Implement server subscription logic
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@MessageBody() data: any, @ConnectedSocket() client: any): void {
    this.logger.log(`Client unsubscribed from server: ${data.serverId}`);
    // TODO: Implement server unsubscription logic
  }

  sendServerLogs(serverId: string, logs: string[]) {
    this.server.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: 'server.logs',
          data: { serverId, logs, timestamp: new Date() },
        })
      );
    });
  }

  sendServerStats(serverId: string, stats: any) {
    this.server.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: 'server.stats',
          data: { serverId, stats, timestamp: new Date() },
        })
      );
    });
  }
}
