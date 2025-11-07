import { PositionUpdate } from '@/protogen/waitroom.pb';
import { SessionStatusMapper } from './session-status.mapper';
import { PositionUpdateRespDto } from '../dtos/resp';

export class StreamPositionMapper {
  static toDto(proto: PositionUpdate): PositionUpdateRespDto {
    return {
      position: Number(proto.position),
      queueLength: Number(proto.queueLength),
      status: SessionStatusMapper.toEnum(proto.status),
      checkoutUrl: proto.checkoutUrl,
      updatedAt: new Date(proto.updatedAt),
    };
  }
}
