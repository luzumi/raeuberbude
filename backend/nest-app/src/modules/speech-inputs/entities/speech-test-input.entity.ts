import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/**
 * SpeechTestInput Entity
 *
 * Speichert Test-Eingaben für Sprach-/Intent-Recognition.
 * Vergleicht erwartete mit tatsächlichen Intents.
 *
 * @see database/DBM-SCHEMA-03-TypeORM-Mapping.md
 */
@Entity('speech_test_inputs')
@Index('ix_speech_test_inputs__created_at', ['createdAt'])
@Index('ix_speech_test_inputs__user_id', ['userId'])
export class SpeechTestInput {
  /**
   * Primärschlüssel (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Optional: Benutzer-ID (Foreign Key)
   */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  /**
   * Test-Text
   */
  @Column({ type: 'text', name: 'text' })
  text: string;

  /**
   * Transcript (transcribed text from audio)
   */
  @Column({ type: 'text', nullable: true })
  transcript: string | null;

  /**
   * Audio Data (base64 encoded)
   */
  @Column({ type: 'text', nullable: true, name: 'audio_data' })
  audioData: string | null;

  /**
   * MIME Type of audio data
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'mime_type' })
  mimeType: string | null;

  /**
   * Erwarteter Intent
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'expected_intent' })
  expectedIntent: string | null;

  /**
   * Tatsächlich erkannter Intent
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'actual_intent' })
  actualIntent: string | null;

  /**
   * Test bestanden?
   */
  @Column({ type: 'boolean', default: false, name: 'passed' })
  passed: boolean;

  /**
   * Zusätzliche Metadaten
   */
  @Column({ type: 'json', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;

  /**
   * Erstellungszeitpunkt
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  /**
   * Letztes Update
   */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // =========================
  // Relations
  // =========================

  /**
   * n:1 Relation zu User
   * ON DELETE SET NULL: Test bleibt erhalten, wenn User gelöscht wird
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_speech_test_inputs__users__user_id',
  })
  user: User | null;
}

