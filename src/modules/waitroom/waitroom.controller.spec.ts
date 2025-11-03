import { Test, TestingModule } from '@nestjs/testing';
import { WaitroomController } from './waitroom.controller';
import { WaitroomService } from './waitroom.service';

describe('WaitroomController', () => {
  let controller: WaitroomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitroomController],
      providers: [WaitroomService],
    }).compile();

    controller = module.get<WaitroomController>(WaitroomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
