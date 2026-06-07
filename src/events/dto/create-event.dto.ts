import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsOptional,
} from 'class-validator';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @ApiProperty({ enum: EventType, example: EventType.VENDA })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ example: { productId: '123', quantity: 2, price: 99.9 } })
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;

  @ApiProperty({ example: 'partner-001' })
  @IsString()
  @IsNotEmpty()
  partnerId: string;

  @ApiProperty({ required: false, description: 'Chave para garantir idempotência' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
