import { Injectable } from '@nestjs/common';
import { RealtimeGateway, DataChangeEvent, DataChangeType } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private realtimeGateway: RealtimeGateway) {}

  emitChange(
    type: DataChangeType,
    entity: string,
    id: string | number,
    data?: Record<string, any>,
    source?: string,
  ) {
    const event: DataChangeEvent = {
      type,
      entity,
      id,
      data,
      timestamp: new Date().toISOString(),
      source,
    };
    this.realtimeGateway.broadcastDataChange(event);
  }

  emitCreate(entity: string, id: string | number, data?: Record<string, any>, source?: string) {
    this.emitChange('created', entity, id, data, source);
  }

  emitUpdate(entity: string, id: string | number, data?: Record<string, any>, source?: string) {
    this.emitChange('updated', entity, id, data, source);
  }

  emitDelete(entity: string, id: string | number, source?: string) {
    this.emitChange('deleted', entity, id, undefined, source);
  }
}
