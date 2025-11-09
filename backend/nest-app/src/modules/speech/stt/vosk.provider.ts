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
  private wsUrl: string;

  constructor(
    private configService: ConfigService,
    private audioConverter: AudioConverterService,
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
      let confidence = 0;
      let resultCount = 0;
      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          ws.close();
          reject(new Error('Vosk transcription timeout'));
        }
      }, 30000);

      ws.on('open', async () => {
        this.logger.debug('Connected to Vosk WebSocket');
        
        // Send config message
        const config = {
          config: {
            sample_rate: 16000,
            words: false,
            max_alternatives: 0,
            phrase_list: VOSK_PHRASES,
          }
        };
        ws.send(JSON.stringify(config));

        try {
          // Ensure audio is 16kHz PCM s16le mono before sending
          const pcmBuffer = await this.audioConverter.convertToPCM(audioBuffer, mimeType, {
            sampleRate: 16000,
            channels: 1,
          });

          // Send audio data in chunks
          const chunkSize = 8192;
          for (let i = 0; i < pcmBuffer.length; i += chunkSize) {
            const chunk = pcmBuffer.slice(i, Math.min(i + chunkSize, pcmBuffer.length));
            ws.send(chunk);
          }

          // Send EOF
          ws.send('{"eof": 1}');
        } catch (convErr: any) {
          this.logger.error(`Audio conversion failed: ${convErr.message}`);
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`Audio conversion failed: ${convErr.message}`));
          }
        }
      });

      ws.on('message', (data) => {
        try {
          const result = JSON.parse(data.toString());
          
          if (result.text) {
            transcript = result.text;
            confidence = 0.9; // Vosk doesn't provide confidence scores directly
            resultCount++;
          } else if (result.partial) {
            // Handle partial results if needed
            this.logger.debug(`Partial result: ${result.partial}`);
          }

          // If we have a final result, close the connection
          if (result.text !== undefined && result.text !== '') {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              ws.close();
              
              resolve({
                provider: this.name,
                transcript: transcript.trim(),
                confidence,
                durationMs: Date.now() - startTime,
                language: language || 'de-DE',
              });
            }
          }
        } catch (error) {
          this.logger.error(`Error parsing Vosk response: ${error.message}`);
        }
      });

      ws.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          reject(new Error(`Vosk WebSocket error: ${error.message}`));
        }
      });

      ws.on('close', () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          
          if (transcript) {
            resolve({
              provider: this.name,
              transcript: transcript.trim(),
              confidence,
              durationMs: Date.now() - startTime,
              language: language || 'de-DE',
            });
          } else {
            reject(new Error('Vosk connection closed without result'));
          }
        }
      });
    });
  }
}
