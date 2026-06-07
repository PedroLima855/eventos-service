import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventStatus } from './entities/event.entity';
import { ProcessingHistory } from './entities/processing-history.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventProcessorService } from './event-processor.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(ProcessingHistory)
    private readonly historyRepo: Repository<ProcessingHistory>,
    private readonly processor: EventProcessorService,
  ) {}

  async create(dto: CreateEventDto): Promise<Event> {
    const idempotencyKey = dto.idempotencyKey || uuidv4();

    const existing = await this.eventRepo.findOne({
      where: { idempotencyKey },
    });
    if (existing) {
      throw new ConflictException('Evento já processado (idempotência)');
    }

    const event = this.eventRepo.create({
      id: uuidv4(),
      type: dto.type,
      payload: dto.payload,
      partnerId: dto.partnerId,
      timestamp: new Date(),
      status: EventStatus.PENDENTE,
      idempotencyKey,
    });

    await this.eventRepo.save(event);
    this.logger.log(`Evento criado: ${event.id} tipo=${event.type}`);

    // Processa de forma assíncrona
    this.processAsync(event.id);

    return event;
  }

  async findById(id: string): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['history'],
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return event;
  }

  async getDeadLetterEvents(): Promise<Event[]> {
    return this.eventRepo.find({
      where: { status: EventStatus.DEAD_LETTER },
      order: { updatedAt: 'DESC' },
    });
  }

  async reprocess(id: string): Promise<Event> {
    const event = await this.findById(id);
    if (
      event.status !== EventStatus.FALHA &&
      event.status !== EventStatus.DEAD_LETTER
    ) {
      throw new ConflictException('Apenas eventos com falha podem ser reprocessados');
    }

    event.status = EventStatus.PENDENTE;
    event.retryCount = 0;
    event.errorMessage = null;
    await this.eventRepo.save(event);

    this.processAsync(event.id);
    return event;
  }

  async getStats() {
    const stats = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.status')
      .getRawMany();

    const total = await this.eventRepo.count();
    const byType = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.type')
      .getRawMany();

    return { total, byStatus: stats, byType };
  }

  private async processAsync(eventId: string): Promise<void> {
    try {
      await this.processor.process(eventId);
    } catch (error) {
      this.logger.error(`Erro ao processar evento ${eventId}: ${error.message}`);
    }
  }
}
