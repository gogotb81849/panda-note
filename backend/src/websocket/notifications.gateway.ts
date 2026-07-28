import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'comment_added'
  | 'warning_triggered'
  | 'meeting_processed'
  | 'system_message';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || '*',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token.replace('Bearer ', ''));
      client.data.userId = payload.sub;
      client.data.teamCode = payload.teamCode;

      // 加入用户专属房间
      client.join(`user:${payload.sub}`);

      // 加入团队房间
      if (payload.teamCode) {
        client.join(`team:${payload.teamCode}`);
      }

      this.logger.log(`User ${payload.sub} connected`);
    } catch (error) {
      this.logger.warn(`Invalid token: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`User ${client.data.userId} disconnected`);
  }

  /**
   * 发送通知给指定用户
   */
  sendToUser(userId: number, notification: NotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * 发送通知给指定团队
   */
  sendToTeam(teamCode: string, notification: NotificationPayload) {
    this.server.to(`team:${teamCode}`).emit('notification', notification);
  }

  /**
   * 广播通知给所有连接的客户端
   */
  sendBroadcast(notification: NotificationPayload) {
    this.server.emit('notification', notification);
  }
}
