import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('processing_history')
export class ProcessingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, (e) => e.history)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column()
  step: string;

  @Column({ type: 'enum', enum: ['SUCCESS', 'FAILURE'] })
  result: 'SUCCESS' | 'FAILURE';

  @Column({ nullable: true })
  details: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
