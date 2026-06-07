import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventProcessorService } from './event-processor.service';
import { Event, EventStatus, EventType } from './entities/event.entity';
import { ProcessingHistory } from './entities/processing-history.entity';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepo: any;

  const mockEventRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 'uuid-1', ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockHistoryRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  const mockProcessor = {
    process: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Event), useValue: mockEventRepo },
        { provide: getRepositoryToken(ProcessingHistory), useValue: mockHistoryRepo },
        { provide: EventProcessorService, useValue: mockProcessor },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventRepo = mockEventRepo;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('deve criar um evento com sucesso', async () => {
      mockEventRepo.findOne.mockResolvedValue(null);
      const dto = {
        type: EventType.VENDA,
        payload: { productId: '1' },
        partnerId: 'partner-1',
      };

      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(mockEventRepo.save).toHaveBeenCalled();
    });

    it('deve rejeitar evento duplicado por idempotência', async () => {
      mockEventRepo.findOne.mockResolvedValue({ id: 'existing' });
      const dto = {
        type: EventType.VENDA,
        payload: { productId: '1' },
        partnerId: 'partner-1',
        idempotencyKey: 'key-1',
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('deve retornar evento existente', async () => {
      const event = { id: 'uuid-1', type: EventType.VENDA };
      mockEventRepo.findOne.mockResolvedValue(event);

      const result = await service.findById('uuid-1');
      expect(result).toEqual(event);
    });

    it('deve lançar erro para evento inexistente', async () => {
      mockEventRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reprocess', () => {
    it('deve reprocessar evento em falha', async () => {
      const event = { id: 'uuid-1', status: EventStatus.FALHA, retryCount: 2 };
      mockEventRepo.findOne.mockResolvedValue(event);

      const result = await service.reprocess('uuid-1');
      expect(result.status).toBe(EventStatus.PENDENTE);
      expect(result.retryCount).toBe(0);
    });

    it('deve rejeitar reprocessamento de evento concluído', async () => {
      const event = { id: 'uuid-1', status: EventStatus.CONCLUIDO };
      mockEventRepo.findOne.mockResolvedValue(event);

      await expect(service.reprocess('uuid-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas', async () => {
      mockEventRepo.count.mockResolvedValue(10);
      const result = await service.getStats();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byType');
    });
  });
});
