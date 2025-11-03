import { Module } from '@nestjs/common';
import { WaitroomService } from './waitroom.service';
import { WaitroomController } from './waitroom.controller';

@Module({
  controllers: [WaitroomController],
  providers: [WaitroomService],
})
export class WaitroomModule {}
