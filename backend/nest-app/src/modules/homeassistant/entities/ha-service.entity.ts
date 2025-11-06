import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ha_services')
export class HaService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  domain: string;

  @Column({ name: 'service_name' })
  serviceName: string;

  @Column({ name: 'full_name', unique: true })
  fullName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  fields: any;

  @Column({ type: 'jsonb', nullable: true })
  target: any;

  @Column({ name: 'response_optional', type: 'boolean', default: true })
  responseOptional: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
