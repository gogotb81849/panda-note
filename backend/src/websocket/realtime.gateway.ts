import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';

export type DataChangeType = 'created' | 'updated' | 'deleted';

export interface DataChangeEvent {
  type: DataChangeType;
  entity: string;
  id: string | number;
  data?: Record<string, any>;
  timestamp: string;
  source?: string;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('RealtimeGateway');

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || (client.handshake.query.token as string);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token.replace('Bearer ', ''));
      client.data.userId = payload.sub;
      client.data.teamCode = payload.teamCode;

      client.join(`user:${payload.sub}`);

      if (payload.teamCode) {
        client.join(`team:${payload.teamCode}`);
      }

      this.logger.log(`User ${payload.sub} connected to realtime`);
    } catch (error) {
      this.logger.warn(`Invalid token: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`User ${client.data.userId} disconnected from realtime`);
  }

  broadcastDataChange(event: DataChangeEvent) {
    this.server.emit('data_change', event);
    this.logger.debug(`Broadcasted ${event.type} for ${event.entity}/${event.id}`);
  }

  sendDataChangeToUser(userId: number, event: DataChangeEvent) {
    this.server.to(`user:${userId}`).emit('data_change', event);
    this.logger.debug(`Sent ${event.type} to user ${userId} for ${event.entity}/${event.id}`);
  }

  sendDataChangeToTeam(teamCode: string, event: DataChangeEvent) {
    this.server.to(`team:${teamCode}`).emit('data_change', event);
    this.logger.debug(`Sent ${event.type} to team ${teamCode} for ${event.entity}/${event.id}`);
  }
}
