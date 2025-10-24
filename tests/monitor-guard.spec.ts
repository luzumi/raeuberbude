import { test, expect } from '@playwright/test';

// Dieser Test stellt sicher, dass beim Seitenstart KEINE Monitor/Display-Off Service-Calls
// ausgelöst werden (wir erkennen diese über das Guard-Log in HomeAssistantService.callService()).

test.beforeEach(async ({ context }) => {
  // Vor Skriptausführung Storage löschen, damit keine alten Overrides (creator.spy*) greifen
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
});

test('no monitor/display off calls on initial load', async ({ page }) => {
  const guardWarnings: string[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if ((type === 'warning' || type === 'error' || type === 'log') && text.includes('[HA][GUARD]')) {
      guardWarnings.push(`${type}: ${text}`);
    }
  });

  await page.goto('/');
  // 15 Sekunden warten, um initiale Subscriptions/Intervals zu beobachten
  await page.waitForTimeout(15000);

  // Es sollten keine GUARD-Warnungen aufgetreten sein
  expect(guardWarnings, 'Es wurden verdächtige Monitor/Display-Off Service-Calls geloggt.').toEqual([]);
});
