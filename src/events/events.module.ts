import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { ProcessingHistory } from './entities/processing-history.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventProcessorService } from './event-processor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, ProcessingHistory])],
  controllers: [EventsController],
  providers: [EventsService, EventProcessorService],
})
export class EventsModule {}
