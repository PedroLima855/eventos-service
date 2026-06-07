import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventProcessorService } from './event-processor.service';
import { Event, EventStatus, EventType } from './entities/event.entity';
import { ProcessingHistory } from './entities/processing-history.entity';

describe('EventProcessorService', () => {
  let service: EventProcessorService;

  const mockEventRepo = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    save: jest.fn((e) => Promise.resolve(e)),
  };

  const mockHistoryRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventProcessorService,
        { provide: getRepositoryToken(Event), useValue: mockEventRepo },
        { provide: getRepositoryToken(ProcessingHistory), useValue: mockHistoryRepo },
      ],
    }).compile();

    service = module.get<EventProcessorService>(EventProcessorService);
  });

  afterEach(() => jest.clearAllMocks());

  it('deve processar evento com sucesso', async () => {
    const event: any = {
      id: 'uuid-1',
      type: EventType.VENDA,
      payload: { productId: '1' },
      partnerId: 'partner-1',
      status: EventStatus.PENDENTE,
      retryCount: 0,
      enrichedData: null,
    };
    mockEventRepo.findOneBy.mockResolvedValue(event);

    await service.process('uuid-1');

    expect(event.status).toBe(EventStatus.CONCLUIDO);
    expect(event.enrichedData).toBeDefined();
  });

  it('deve marcar como FALHA quando payload vazio', async () => {
    const event: any = {
      id: 'uuid-2',
      type: EventType.VENDA,
      payload: {},
      partnerId: 'partner-1',
      status: EventStatus.PENDENTE,
      retryCount: 0,
    };
    mockEventRepo.findOneBy.mockResolvedValue(event);

    await service.process('uuid-2');

    expect(event.status).toBe(EventStatus.FALHA);
    expect(event.retryCount).toBe(1);
  });

  it('deve mover para dead-letter após MAX_RETRIES', async () => {
    const event: any = {
      id: 'uuid-3',
      type: EventType.VENDA,
      payload: {},
      partnerId: 'partner-1',
      status: EventStatus.PENDENTE,
      retryCount: 4,
    };
    mockEventRepo.findOneBy.mockResolvedValue(event);

    await service.process('uuid-3');

    expect(event.status).toBe(EventStatus.DEAD_LETTER);
  });

  it('deve ignorar se evento não existe', async () => {
    mockEventRepo.findOneBy.mockResolvedValue(null);
    await service.process('inexistente');
    expect(mockEventRepo.save).not.toHaveBeenCalled();
  });
});
