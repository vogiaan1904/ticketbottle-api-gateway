import { SessionStatus } from '../../enums';

export class PositionUpdateRespDto {
  position: number;
  queueLength: number;
  status: SessionStatus;
  checkoutUrl: string;
  updatedAt: Date;
}
