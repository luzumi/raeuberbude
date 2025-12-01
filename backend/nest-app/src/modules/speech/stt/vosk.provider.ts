import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { STTProvider, TranscriptionResult } from './stt.provider';
import { AudioConverterService } from './audio-converter.service';

// Domain phrases to bias Vosk recognition towards typical home-automation commands (German)
const VOSK_PHRASES: string[] = [
  // Devices / actions
  'fernseher', 'tv', 'licht', 'lampen', 'rollos', 'jalousien', 'heizung', 'musik', 'spotify', 'lautstärke', 'stumm',
  'an', 'aus', 'ein', 'ausmachen', 'anmachen', 'einschalten', 'ausschalten', 'dimmen', 'heller', 'dunkler',
  'pause', 'weiter', 'nächster song', 'vorheriger song', 'stopp', 'stop', 'play',
  // Rooms
  'wohnzimmer', 'schlafzimmer', 'küche', 'bad', 'flur', 'keller', 'büro',
  // Typical full commands
  'schalte den fernseher aus', 'schalte den fernseher an', 'schalte alle fernseher aus',
  'mach das licht im wohnzimmer aus', 'mach das licht im wohnzimmer an',
  'schalte das licht an', 'schalte das licht aus',
  'stell die lautstärke auf fünf', 'stell die lautstärke auf zehn',
  'pause die musik', 'spiel musik im wohnzimmer',
];

@Injectable()
export class VoskProvider implements STTProvider {
  readonly name = 'vosk';
  private readonly logger = new Logger(VoskProvider.name);
  private readonly wsUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly audioConverter: AudioConverterService,
  ) {
    this.wsUrl = this.configService.get<string>('VOSK_WS_URL', 'ws://localhost:2700');
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    language?: string,
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      let transcript = '';
      let partial = '';
      let isResolved = false;

      const hardTimeout = setTimeout(() => {
        if (!isResolved) {
          try { ws.close(); } catch {}
          isResolved = true;
          reject(new Error('Vosk transcription timeout'));
        }
      }, 30000);

      const resolveWith = (text: string) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(hardTimeout);
        try { ws.close(); } catch {}

        // WICHTIG: Wenn Text leer ist, reject statt resolve mit leerer Transkription
        if (!text || !text.trim()) {
          reject(new Error('Vosk returned empty transcription'));
          return;
        }

        resolve({
          provider: this.name,
          transcript: text.trim(),
          confidence: 0.9,
          durationMs: Date.now() - startTime,
          language: language || 'de-DE',
        });
      };

      ws.on('open', async () => {
        this.logger.debug('Connected to Vosk WebSocket');
        const config = {
          config: { sample_rate: 16000, words: false, max_alternatives: 0, phrase_list: VOSK_PHRASES }
        };
        ws.send(JSON.stringify(config));

        try {
          const pcmBuffer = await this.audioConverter.convertToPCM(audioBuffer, mimeType, { sampleRate: 16000, channels: 1 });
          const chunkSize = 8192;
          for (let i = 0; i < pcmBuffer.length; i += chunkSize) {
            const chunk = pcmBuffer.slice(i, Math.min(i + chunkSize, pcmBuffer.length));
            ws.send(chunk);
          }
          // kleines Flush-Delay, dann EOF
          setTimeout(() => { try { ws.send('{"eof": 1}'); } catch {} }, 10);
        } catch (error_: any) {
          this.logger.error(`Audio conversion failed: ${error_.message}`);
          resolveWith('');
        }
      });

      ws.on('message', (data) => {
        try {
          const result = JSON.parse(data.toString());
          if (typeof result.partial === 'string') {
            partial = result.partial;
            this.logger.debug(`Partial result: ${partial}`);
          }
          if (typeof result.text === 'string') {
            transcript = result.text;
          }
        } catch (error) {
          this.logger.error(`Error parsing Vosk response: ${error.message}`);
        }
      });

      ws.on('error', (error) => {
        if (!isResolved) {
          this.logger.error(`Vosk WebSocket error: ${error.message}`);
          const finalText = transcript || partial || '';
          if (!finalText) {
            // WICHTIG: Wenn keine Transkription, reject statt leeren String
            isResolved = true;
            clearTimeout(hardTimeout);
            try { ws.close(); } catch {}
            reject(new Error(`Vosk WebSocket error: ${error.message}`));
          } else {
            resolveWith(finalText);
          }
        }
      });

      ws.on('close', () => {
        if (!isResolved) {
          const finalText = transcript || partial || '';
          if (finalText) {
            resolveWith(finalText);
          } else {
            this.logger.error('Vosk connection closed without result');
            // WICHTIG: Reject statt leeren String
            isResolved = true;
            clearTimeout(hardTimeout);
            reject(new Error('Vosk connection closed without result'));
          }
        }
      });
    });
  }
}
