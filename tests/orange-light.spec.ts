import { test, expect } from '@playwright/test';

/**
 * Orange Light E2E Tests
 *
 * Tests the transparent lamp image feature with toggle functionality
 *
 * NOTE: Login wird vor jedem Test durchgeführt, da automatische Weiterleitung nicht funktioniert
 */

test.describe('Orange Light Feature', () => {

  test.beforeEach(async ({ page }) => {
    // Login für jeden Test (Weiterleitung funktioniert nicht automatisch)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Klicke Login-Button
    await page.locator('button[type="submit"]').click();

    // Warte kurz und navigiere explizit zu /bude
    await page.waitForTimeout(1000);
    await page.goto('/bude');
    await page.waitForLoadState('networkidle');

    // Zusätzliche Wartezeit für Grid-Initialisierung
    await page.waitForTimeout(500);
  });

  test('should display the grid container', async ({ page }) => {
    await expect(page.locator('.grid-container')).toBeVisible();
  });

  test('should display Orange Light tile', async ({ page }) => {
    await expect(page.locator('.grid-item.orange-light')).toBeVisible();
  });

  test('should display lamp image', async ({ page }) => {
    const lampImage = page.locator('.grid-item.orange-light img.lamp-icon');
    await expect(lampImage).toBeVisible();
  });

  test('should show lamp in OFF state initially', async ({ page }) => {
    const lampImage = page.locator('.grid-item.orange-light img.lamp-icon.off');
    await expect(lampImage).toBeVisible({ timeout: 10000 });
  });

  test('should toggle lamp to ON when clicked', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');

    // Click to turn on
    await tile.click();

    // Wait for state change (with WebSocket delay)
    await page.waitForTimeout(2000);

    // Check lamp is ON
    const lampOn = page.locator('.grid-item.orange-light img.lamp-icon.on');
    await expect(lampOn).toBeVisible({ timeout: 5000 });
  });

  test('should toggle lamp back to OFF', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');

    // First click: turn on
    await tile.click();
    await page.waitForTimeout(2000);

    // Second click: turn off
    await tile.click();
    await page.waitForTimeout(2000);

    // Check lamp is OFF
    const lampOff = page.locator('.grid-item.orange-light img.lamp-icon.off');
    await expect(lampOff).toBeVisible({ timeout: 5000 });
  });

  test('should open detail view on long press', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');

    // Simulate long press
    await tile.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    // Check detail view is open
    await expect(page.locator('app-orange-light')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('.back-button')).toBeVisible();
  });

  test('should handle rapid clicks gracefully', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');

    // Rapid clicks (5x)
    for (let i = 0; i < 5; i++) {
      await tile.click({ delay: 50 });
    }

    // Wait for state to settle
    await page.waitForTimeout(2000);

    // Lamp should be in a valid state (either on or off)
    const lampOn = page.locator('.grid-item.orange-light img.lamp-icon.on');
    const lampOff = page.locator('.grid-item.orange-light img.lamp-icon.off');

    const isOn = await lampOn.isVisible();
    const isOff = await lampOff.isVisible();

    // Should be exactly one state
    expect(isOn || isOff).toBeTruthy();
    expect(isOn && isOff).toBeFalsy();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    const lampImage = page.locator('.grid-item.orange-light img.lamp-icon');
    await expect(lampImage).toBeVisible();

    // Check image is properly sized
    const box = await lampImage.boundingBox();
    expect(box?.width).toBeGreaterThan(50);
    expect(box?.width).toBeLessThan(150);
  });

  test('should have proper CSS classes for states', async ({ page }) => {
    const lampImage = page.locator('.grid-item.orange-light img.lamp-icon');

    // Get current class
    const className = await lampImage.getAttribute('class');

    // Should have one of: on, off, unavailable
    expect(
      className?.includes('on') ||
      className?.includes('off') ||
      className?.includes('unavailable')
    ).toBeTruthy();
  });

  test('should persist state after page reload', async ({ page }) => {
    const tile = page.locator('.grid-item.orange-light');

    // Turn lamp on
    await tile.click();
    await page.waitForTimeout(2000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // State should be persisted (lamp still on)
    const lampOn = page.locator('.grid-item.orange-light img.lamp-icon.on');
    await expect(lampOn).toBeVisible({ timeout: 5000 });
  });
});
