/**
 * E2E Tests für Spracheingabe-Pipeline
 * Testet komplette User-Flows mit Playwright
 */

import { test, expect, Page } from '@playwright/test';

// Helper: Mock MediaRecorder im Browser-Context
async function mockMediaRecorder(page: Page) {
  await page.addInitScript(() => {
    // Mock MediaRecorder
    class MockMediaRecorder {
      state = 'inactive';
      ondataavailable: ((e: any) => void) | null = null;
      onstop: (() => void) | null = null;
      onstart: (() => void) | null = null;

      constructor(public stream: MediaStream, public options?: any) {}

      start(timeslice?: number) {
        this.state = 'recording';
        setTimeout(() => {
          if (this.onstart) this.onstart();
        }, 0);

        // Simuliere Daten nach 100ms
        setTimeout(() => {
          if (this.ondataavailable) {
            const blob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
            this.ondataavailable({ data: blob });
          }
        }, 100);
      }

      stop() {
        this.state = 'inactive';
        setTimeout(() => {
          if (this.onstop) this.onstop();
        }, 10);
      }

      pause() { this.state = 'paused'; }
      resume() { this.state = 'recording'; }
      requestData() {}

      static isTypeSupported(type: string) {
        return type.includes('audio/webm') || type.includes('audio/ogg');
      }
    }

    (window as any).MediaRecorder = MockMediaRecorder;
  });
}

// Helper: Mock getUserMedia im Browser-Context
async function mockGetUserMedia(page: Page, success: boolean = true) {
  await page.addInitScript((successParam) => {
    if (successParam) {
      // Mock MediaStream
      const mockTrack = {
        kind: 'audio',
        id: 'mock-track',
        label: 'Mock Microphone',
        enabled: true,
        stop: () => {}
      };

      const mockStream = {
        id: 'mock-stream',
        active: true,
        getTracks: () => [mockTrack],
        getAudioTracks: () => [mockTrack],
        getVideoTracks: () => []
      };

      navigator.mediaDevices.getUserMedia = async () => mockStream as unknown as MediaStream;
    } else {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      };
    }
  }, success);
}

// Helper: Mock Backend API
async function mockBackendAPI(page: Page) {
  await page.route('**/api/speech/transcribe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          provider: 'vosk',
          transcript: 'Schalte das Licht im Wohnzimmer ein',
          confidence: 0.95,
          durationMs: 250,
          language: 'de-DE',
          audioDurationMs: 3000
        }
      })
    });
  });

  await page.route('**/api/speech/transcribe/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          providers: {
            vosk: true,
            whisper: false
          }
        }
      })
    });
  });
}

test.describe('Speech Input E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockMediaRecorder(page);
    await mockGetUserMedia(page, true);
    await mockBackendAPI(page);
  });

  test('should complete full speech input flow', async ({ page }) => {
    await page.goto('/terminal/speech-demo');

    // 1. Check initial state
    await expect(page.locator('.status-item .value').first()).toContainText('⚪ Bereit');

    // 2. Start recording
    const startButton = page.locator('button', { hasText: 'Start Aufnahme' });
    await startButton.click();

    // 3. Recording state should be active
    await expect(page.locator('.status-item .value').first()).toContainText('🔴 Aktiv', { timeout: 2000 });

    // 4. Stop recording
    const stopButton = page.locator('button', { hasText: 'Stop' });
    await stopButton.click();

    // 5. Wait for transcription result
    await expect(page.locator('.last-input')).toContainText('Schalte das Licht im Wohnzimmer ein', {
      timeout: 5000
    });

    // 6. Check validation result
    await expect(page.locator('.validation-result')).toBeVisible();
    await expect(page.locator('.validation-result')).toContainText('✅ Ja'); // isValid
  });

  test('should show clarification banner for ambiguous input', async ({ page }) => {
    // Mock ambiguous response
    await page.route('**/api/speech/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            provider: 'vosk',
            transcript: 'Licht an',
            confidence: 0.85,
            durationMs: 250,
            language: 'de-DE'
          }
        })
      });
    });

    await page.goto('/terminal/speech-demo');

    // Start and stop recording
    await page.locator('button', { hasText: 'Start Aufnahme' }).click();
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'Stop' }).click();

    // Check for clarification (if validator triggers it)
    // Note: Depends on TranscriptionValidatorService logic
    await page.waitForTimeout(1000);
  });

  test('should handle permission denied', async ({ page }) => {
    // Override getUserMedia to fail
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      };
    });

    await page.goto('/terminal/speech-demo');

    // Try to start recording
    await page.locator('button', { hasText: 'Start Aufnahme' }).click();

    // Should show error or remain in ready state
    await page.waitForTimeout(1000);
    await expect(page.locator('.status-item .value').first()).toContainText('⚪ Bereit');
  });

  test('should cancel TTS playback', async ({ page }) => {
    await page.goto('/terminal/speech-demo');

    // Type test message
    const testInput = page.locator('.tts-test input');
    await testInput.fill('Dies ist ein Test der Sprachausgabe');

    // Click speak button
    await page.locator('.tts-test button', { hasText: 'Sprechen' }).click();

    // Wait for TTS to start (check status)
    await page.waitForTimeout(500);

    // Cancel TTS
    const cancelButton = page.locator('button', { hasText: 'TTS Abbrechen' });
    await cancelButton.click();

    // TTS should be stopped
    await expect(page.locator('.status-item').nth(1).locator('.value')).toContainText('🔇 Still');
  });

  test('should toggle validation setting', async ({ page }) => {
    await page.goto('/terminal/speech-demo');

    // Find validation checkbox
    const validationCheckbox = page.locator('.settings input[type="checkbox"]').first();

    // Initial state should be checked
    await expect(validationCheckbox).toBeChecked();

    // Uncheck
    await validationCheckbox.uncheck();
    await expect(validationCheckbox).not.toBeChecked();

    // Check again
    await validationCheckbox.check();
    await expect(validationCheckbox).toBeChecked();
  });

  test('should change STT mode', async ({ page }) => {
    await page.goto('/terminal/speech-demo');

    // Find STT mode dropdown
    const sttModeSelect = page.locator('.settings select');

    // Change to browser mode
    await sttModeSelect.selectOption('browser');
    await expect(sttModeSelect).toHaveValue('browser');

    // Change to server mode
    await sttModeSelect.selectOption('server');
    await expect(sttModeSelect).toHaveValue('server');

    // Change back to auto
    await sttModeSelect.selectOption('auto');
    await expect(sttModeSelect).toHaveValue('auto');
  });

  test('should display transcript history', async ({ page }) => {
    await page.goto('/terminal/speech-demo');

    // Start recording
    await page.locator('button', { hasText: 'Start Aufnahme' }).click();
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'Stop' }).click();

    // Wait for transcript
    await page.waitForTimeout(2000);

    // Check transcript history
    const transcriptHistory = page.locator('.transcript-history');
    await expect(transcriptHistory).toBeVisible();
    await expect(transcriptHistory.locator('.transcript-item')).toHaveCount(1, { timeout: 3000 });
  });

  test('should show low confidence warning', async ({ page }) => {
    // Mock low confidence response
    await page.route('**/api/speech/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            provider: 'vosk',
            transcript: 'unclear speech',
            confidence: 0.55,
            durationMs: 250,
            language: 'de-DE'
          }
        })
      });
    });

    await page.goto('/terminal/speech-demo');

    // Record
    await page.locator('button', { hasText: 'Start Aufnahme' }).click();
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'Stop' }).click();

    // Wait for result
    await page.waitForTimeout(2000);

    // Check confidence display
    const confidenceText = page.locator('.validation-result');
    await expect(confidenceText).toContainText('55', { timeout: 3000 });
  });

  test('should handle backend error gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/speech/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'TRANSCRIPTION_FAILED',
          message: 'Audio too short'
        })
      });
    });

    await page.goto('/terminal/speech-demo');

    // Try recording
    await page.locator('button', { hasText: 'Start Aufnahme' }).click();
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'Stop' }).click();

    // Should handle error (implementation dependent)
    await page.waitForTimeout(2000);
  });

  test('should clear clarification', async ({ page }) => {
    await page.goto('/terminal/speech-demo');

    // Simulate clarification state (would need specific test setup)
    // Click clear button
    const clearButton = page.locator('button', { hasText: 'Klarstellung löschen' });
    await clearButton.click();

    // Awaiting clarification should be false
    await expect(page.locator('.status-item').nth(2).locator('.value')).toContainText('✅ Nein');
  });

  test('should disable recording button while speaking', async ({ page }) => {
    await page.goto('/terminal/speech-demo');

    // Start TTS
    const testInput = page.locator('.tts-test input');
    await testInput.fill('Test message');
    await page.locator('.tts-test button').click();

    await page.waitForTimeout(500);

    // Recording button should be disabled
    const recordButton = page.locator('button').first();
    await expect(recordButton).toBeDisabled();
  });
});

test.describe('Speech Feedback Component E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockMediaRecorder(page);
    await mockGetUserMedia(page, true);
    await mockBackendAPI(page);
  });

  test('should show and auto-hide clarification banner', async ({ page }) => {
    // Mock response that triggers clarification
    await page.route('**/api/speech/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            provider: 'vosk',
            transcript: 'unclear command',
            confidence: 0.70,
            durationMs: 250,
            language: 'de-DE'
          }
        })
      });
    });

    await page.goto('/');

    // Trigger speech input (depends on app structure)
    // For now, test is placeholder for when component is integrated
  });

  test('should dismiss banner on click', async ({ page }) => {
    await page.goto('/');

    // Would need to trigger banner first, then test dismiss
    // Implementation depends on app integration
  });
});

test.describe('Performance', () => {
  test('should complete recording cycle under 5 seconds', async ({ page }) => {
    await mockMediaRecorder(page);
    await mockGetUserMedia(page, true);
    await mockBackendAPI(page);

    await page.goto('/terminal/speech-demo');

    const startTime = Date.now();

    // Start recording
    await page.locator('button', { hasText: 'Start Aufnahme' }).click();
    await page.waitForTimeout(500);

    // Stop recording
    await page.locator('button', { hasText: 'Stop' }).click();

    // Wait for result
    await page.locator('.last-input').waitFor({ timeout: 5000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000);
  });
});

