import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@ApiTags('Eventos')
@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Receber evento de parceiro' })
  @ApiResponse({ status: 201, description: 'Evento criado e enfileirado para processamento' })
  @ApiResponse({ status: 409, description: 'Evento duplicado (idempotência)' })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de processamento' })
  getStats() {
    return this.eventsService.getStats();
  }

  @Get('dead-letter')
  @ApiOperation({ summary: 'Listar eventos na dead-letter queue' })
  getDeadLetter() {
    return this.eventsService.getDeadLetterEvents();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar status de processamento de um evento' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocessar evento com falha ou dead-letter' })
  @ApiResponse({ status: 409, description: 'Evento não está em estado de falha' })
  reprocess(@Param('id') id: string) {
    return this.eventsService.reprocess(id);
  }
}
