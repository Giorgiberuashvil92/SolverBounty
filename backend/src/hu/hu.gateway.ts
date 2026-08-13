import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { User } from '../dashboard/schemas';
import type { ClientAction } from './hu.engine';
import { HuService } from './hu.service';

type AuthedSocket = Socket & {
  data: { userId?: string; displayName?: string };
};

@WebSocketGateway({
  cors: { origin: true },
  namespace: '/hu',
})
export class HuGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly log = new Logger(HuGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly hu: HuService,
    private readonly jwt: JwtService,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  afterInit() {
    this.hu.setEmitter((socketId, event, payload) => {
      this.server.to(socketId).emit(event, payload);
    });
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '') ??
          undefined);
      if (!token) {
        client.emit('error_msg', { message: 'Unauthorized' });
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify<{ sub: string; email: string }>(token);
      const user = await this.users.findById(payload.sub).lean();
      const displayName =
        user?.displayName?.trim() ||
        user?.email?.split('@')[0] ||
        payload.email?.split('@')[0] ||
        'Player';
      client.data.userId = payload.sub;
      client.data.displayName = displayName;
      this.hu.bindSocket(payload.sub, client.id);
      client.emit('connected', { userId: payload.sub, displayName });
    } catch (e) {
      this.log.warn(`WS auth failed: ${(e as Error).message}`);
      client.emit('error_msg', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthedSocket) {
    const userId = client.data.userId;
    if (!userId) return;
    this.hu.handleDisconnect(userId, client.id);
  }

  @SubscribeMessage('queue:join')
  onQueueJoin(@ConnectedSocket() client: AuthedSocket) {
    const userId = client.data.userId;
    const displayName = client.data.displayName ?? 'Player';
    if (!userId) return { ok: false, error: 'Unauthorized' };
    const result = this.hu.queueJoin({
      userId,
      displayName,
      socketId: client.id,
    });
    if (result.status === 'matched' || result.status === 'rejoined') {
      const view = this.hu.viewForUser(userId);
      if (view) client.emit('table_state', view);
    }
    return { ok: true, ...result };
  }

  @SubscribeMessage('queue:leave')
  onQueueLeave(@ConnectedSocket() client: AuthedSocket) {
    const userId = client.data.userId;
    if (!userId) return { ok: false };
    this.hu.queueLeave(userId);
    return { ok: true };
  }

  @SubscribeMessage('table:action')
  onAction(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: ClientAction,
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false, error: 'Unauthorized' };
    try {
      this.hu.applyAction(userId, body);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage('table:sync')
  onSync(@ConnectedSocket() client: AuthedSocket) {
    const userId = client.data.userId;
    if (!userId) return { ok: false };
    const view = this.hu.viewForUser(userId);
    if (view) client.emit('table_state', view);
    return { ok: true };
  }
}
