import { Test, TestingModule } from '@nestjs/testing';
import { WaitroomService } from './waitroom.service';

describe('WaitroomService', () => {
  let service: WaitroomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WaitroomService],
    }).compile();

    service = module.get<WaitroomService>(WaitroomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
