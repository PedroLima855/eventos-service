import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Event, EventStatus } from './entities/event.entity';
import { ProcessingHistory } from './entities/processing-history.entity';

const MAX_RETRIES = 5;

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(ProcessingHistory)
    private readonly historyRepo: Repository<ProcessingHistory>,
  ) {}

  async process(eventId: string): Promise<void> {
    const event = await this.eventRepo.findOneBy({ id: eventId });
    if (!event) return;

    event.status = EventStatus.PROCESSANDO;
    await this.eventRepo.save(event);

    try {
      this.validate(event);
      await this.logHistory(event.id, 'VALIDACAO', 'SUCCESS');

      event.enrichedData = this.enrich(event);
      await this.logHistory(event.id, 'ENRIQUECIMENTO', 'SUCCESS');

      await this.distribute(event);
      await this.logHistory(event.id, 'DISTRIBUICAO', 'SUCCESS');

      event.status = EventStatus.CONCLUIDO;
      event.errorMessage = null;
      await this.eventRepo.save(event);
      this.logger.log(`Evento ${event.id} processado com sucesso`);
    } catch (error: any) {
      event.retryCount += 1;
      event.errorMessage = error.message;

      if (event.retryCount >= MAX_RETRIES) {
        event.status = EventStatus.DEAD_LETTER;
        this.logger.warn(`Evento ${event.id} movido para dead-letter`);
      } else {
        event.status = EventStatus.FALHA;
        this.logger.warn(
          `Evento ${event.id} falhou (tentativa ${event.retryCount}/${MAX_RETRIES})`,
        );
      }

      await this.eventRepo.save(event);
      await this.logHistory(event.id, 'PROCESSAMENTO', 'FAILURE', error.message);
    }
  }

  private validate(event: Event): void {
    if (!event.payload || Object.keys(event.payload).length === 0) {
      throw new Error('Payload do evento está vazio');
    }
    if (!event.partnerId) {
      throw new Error('PartnerId é obrigatório');
    }
  }

  private enrich(event: Event): Record<string, any> {
    return {
      processedAt: new Date().toISOString(),
      region: 'br-east-1',
      version: '1.0',
      partnerTier: 'premium',
    };
  }

  private async distribute(event: Event): Promise<void> {
    this.logger.debug(
      `Distribuindo evento ${event.id} tipo=${event.type} para serviços downstream`,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  private async logHistory(
    eventId: string,
    step: string,
    result: 'SUCCESS' | 'FAILURE',
    details?: string,
  ): Promise<void> {
    await this.historyRepo.save(
      this.historyRepo.create({ eventId, step, result, details }),
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async retryFailedEvents(): Promise<void> {
    const failed = await this.eventRepo.find({
      where: { status: EventStatus.FALHA },
      take: 10,
    });

    for (const event of failed) {
      this.logger.log(`Retry automático para evento ${event.id}`);
      await this.process(event.id);
    }
  }
}
