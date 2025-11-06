import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { HaEntity } from './ha-entity.entity';

@Entity('ha_media_players')
export class HaMediaPlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_id', unique: true })
  entityId: string;

  @OneToOne(() => HaEntity, entity => entity.mediaPlayer)
  @JoinColumn({ name: 'entity_id', referencedColumnName: 'id' })
  entity: HaEntity;

  @Column({ name: 'volume_level', type: 'float', nullable: true })
  volumeLevel: number;

  @Column({ name: 'is_volume_muted', type: 'boolean', default: false })
  isVolumeMuted: boolean;

  @Column({ name: 'media_content_type', nullable: true })
  mediaContentType: string;

  @Column({ name: 'media_title', nullable: true })
  mediaTitle: string;

  @Column({ name: 'media_artist', nullable: true })
  mediaArtist: string;

  @Column({ name: 'group_members', type: 'jsonb', nullable: true })
  groupMembers: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
