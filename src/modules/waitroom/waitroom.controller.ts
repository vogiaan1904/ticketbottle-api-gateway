import { Controller } from '@nestjs/common';
import { WaitroomService } from './waitroom.service';

@Controller('waitroom')
export class WaitroomController {
  constructor(private readonly waitroomService: WaitroomService) {}
}
