import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProcessingHistory } from './processing-history.entity';

export enum EventType {
  VENDA = 'VENDA',
  DEVOLUCAO = 'DEVOLUCAO',
  ATUALIZACAO_ESTOQUE = 'ATUALIZACAO_ESTOQUE',
  CANCELAMENTO = 'CANCELAMENTO',
}

export enum EventStatus {
  PENDENTE = 'PENDENTE',
  PROCESSANDO = 'PROCESSANDO',
  CONCLUIDO = 'CONCLUIDO',
  FALHA = 'FALHA',
  DEAD_LETTER = 'DEAD_LETTER',
}

@Entity('events')
export class Event {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.PENDENTE })
  status: EventStatus;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'enriched_data', type: 'jsonb', nullable: true })
  enrichedData: Record<string, any> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProcessingHistory, (h) => h.event)
  history: ProcessingHistory[];
}
