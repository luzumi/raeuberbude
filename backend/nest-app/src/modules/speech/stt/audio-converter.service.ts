import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import * as ffprobeStatic from 'ffprobe-static';
import { Readable, PassThrough } from 'stream';
import * as fsSync from 'fs';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Set ffmpeg/ffprobe paths (as strings)
const __ffmpegPath = (process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string)) as string | undefined;
if (__ffmpegPath) {
  // eslint-disable-next-line no-console
  console.log(`[AudioConverterService] Using ffmpeg at: ${__ffmpegPath}`);
  ffmpeg.setFfmpegPath(__ffmpegPath);
} else {
  // eslint-disable-next-line no-console
  console.warn('[AudioConverterService] FFMPEG_PATH not resolved; relying on system PATH');
}

const __ffprobePath = ((ffprobeStatic as any)?.path ?? (ffprobeStatic as any)?.default?.path) as string | undefined;
if (__ffprobePath) {
  ffmpeg.setFfprobePath(__ffprobePath);
}

export interface AudioConversionOptions {
  format?: 'pcm' | 'wav' | 'mp3';
  sampleRate?: number;
  channels?: number;
  codec?: string;
}

@Injectable()
export class AudioConverterService {
  private readonly logger = new Logger(AudioConverterService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'stt-audio');

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create temp directory: ${error.message}`);
    }
  }

  /**
   * Convert audio buffer to PCM format for Vosk
   */
  async convertToPCM(
    audioBuffer: Buffer,
    mimeType: string,
    options: AudioConversionOptions = {}
  ): Promise<Buffer> {
    const {
      sampleRate = 16000,
      channels = 1,
    } = options;

    return new Promise(async (resolve, reject) => {
      const tempInputFile = path.join(this.tempDir, `input-${Date.now()}.audio`);
      const tempOutputFile = path.join(this.tempDir, `output-${Date.now()}.pcm`);

      try {
        // Write input buffer to temp file
        await fs.writeFile(tempInputFile, audioBuffer);

        // Convert using ffmpeg
        ffmpeg(tempInputFile)
          .audioCodec('pcm_s16le')
          .audioFrequency(sampleRate)
          .audioChannels(channels)
          .format('s16le')
          .on('error', async (err) => {
            this.logger.error(`FFmpeg conversion error: ${err.message}`);
            await this.cleanupFiles([tempInputFile, tempOutputFile]);
            reject(err);
          })
          .on('end', async () => {
            try {
              const pcmBuffer = await fs.readFile(tempOutputFile);
              await this.cleanupFiles([tempInputFile, tempOutputFile]);
              resolve(pcmBuffer);
            } catch (error) {
              reject(error);
            }
          })
          .save(tempOutputFile);
      } catch (error) {
        await this.cleanupFiles([tempInputFile, tempOutputFile]);
        reject(error);
      }
    });
  }

  /**
   * Convert audio buffer to WAV format for Whisper
   */
  async convertToWAV(
    audioBuffer: Buffer,
    mimeType: string,
    options: AudioConversionOptions = {}
  ): Promise<Buffer> {
    const {
      sampleRate = 16000,
      channels = 1,
    } = options;

    return new Promise(async (resolve, reject) => {
      const tempInputFile = path.join(this.tempDir, `input-${Date.now()}.audio`);
      const tempOutputFile = path.join(this.tempDir, `output-${Date.now()}.wav`);

      try {
        // Write input buffer to temp file
        await fs.writeFile(tempInputFile, audioBuffer);

        // Convert using ffmpeg
        ffmpeg(tempInputFile)
          .audioCodec('pcm_s16le')
          .audioFrequency(sampleRate)
          .audioChannels(channels)
          .format('wav')
          .on('error', async (err) => {
            this.logger.error(`FFmpeg conversion error: ${err.message}`);
            await this.cleanupFiles([tempInputFile, tempOutputFile]);
            reject(err);
          })
          .on('end', async () => {
            try {
              const wavBuffer = await fs.readFile(tempOutputFile);
              await this.cleanupFiles([tempInputFile, tempOutputFile]);
              resolve(wavBuffer);
            } catch (error) {
              reject(error);
            }
          })
          .save(tempOutputFile);
      } catch (error) {
        await this.cleanupFiles([tempInputFile, tempOutputFile]);
        reject(error);
      }
    });
  }

  /**
   * Get audio duration from buffer
   */
  async getAudioDuration(audioBuffer: Buffer, mimeType: string): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const tempFile = path.join(this.tempDir, `duration-check-${Date.now()}.audio`);

      try {
        await fs.writeFile(tempFile, audioBuffer);

        ffmpeg.ffprobe(tempFile, async (err, metadata) => {
          await this.cleanupFiles([tempFile]);

          if (err) {
            reject(err);
          } else {
            const duration = metadata.format.duration || 0;
            resolve(duration * 1000); // Convert to milliseconds
          }
        });
      } catch (error) {
        await this.cleanupFiles([tempFile]);
        reject(error);
      }
    });
  }

  /**
   * Validate audio format and size
   */
  async validateAudio(
    audioBuffer: Buffer,
    mimeType: string,
    maxDurationMs: number = 30000
  ): Promise<{ valid: boolean; duration?: number; error?: string }> {
    try {
      // Check buffer size (rough estimate)
      const maxSizeBytes = maxDurationMs * 32; // 16kHz * 2 bytes/sample
      if (audioBuffer.length > maxSizeBytes * 2) { // Allow 2x for compressed formats
        return { 
          valid: false, 
          error: `Audio file too large (${Math.round(audioBuffer.length / 1024)}KB)` 
        };
      }

      // Check actual duration
      const duration = await this.getAudioDuration(audioBuffer, mimeType);
      if (duration > maxDurationMs) {
        return { 
          valid: false, 
          duration, 
          error: `Audio duration (${Math.round(duration / 1000)}s) exceeds maximum (${maxDurationMs / 1000}s)` 
        };
      }

      return { valid: true, duration };
    } catch (error) {
      this.logger.error(`Audio validation error: ${error.message}`);
      return { 
        valid: false, 
        error: `Failed to validate audio: ${error.message}` 
      };
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupFiles(files: string[]) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors
        this.logger.debug(`Failed to cleanup temp file ${file}: ${error.message}`);
      }
    }
  }

  /**
   * Clean up old temporary files (run periodically)
   */
  async cleanupOldFiles(maxAgeMs: number = 3600000) { // 1 hour default
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          this.logger.debug(`Cleaned up old temp file: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old files: ${error.message}`);
    }
  }
}
