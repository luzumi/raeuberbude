/**
 * Puppeteer Test für Orange-Light Feature
 * 
 * Testet:
 * - Lampenbild wird angezeigt
 * - Toggle funktioniert (An/Aus)
 * - Visuelle State-Änderung
 * - WebSocket-Messages
 * 
 * Usage: node test-orange-light.js
 */

const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starte Orange-Light Test...\n');

  const browser = await puppeteer.launch({
    headless: false, // Browser sichtbar
    slowMo: 100, // Langsamer für Debugging
    devtools: true // DevTools öffnen
  });

  const page = await browser.newPage();
  
  // Console-Logs abfangen
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Orange Light') || text.includes('[HA]')) {
      console.log('📝 Browser Console:', text);
    }
  });

  // WebSocket-Messages monitoren
  const wsMessages = [];
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  
  client.on('Network.webSocketFrameReceived', ({ response }) => {
    try {
      const data = JSON.parse(response.payloadData);
      if (data.type === 'event' && data.event?.c) {
        const entities = Object.keys(data.event.c);
        if (entities.includes('light.wiz_tunable_white_640190')) {
          console.log('📡 WebSocket: Light State Change:', data.event.c['light.wiz_tunable_white_640190']);
          wsMessages.push(data);
        }
      }
    } catch (e) {
      // Nicht-JSON Messages ignorieren
    }
  });

  try {
    // Navigiere zur Bude-Seite
    console.log('📍 Navigiere zu http://localhost:4200/bude\n');
    await page.goto('http://localhost:4200/bude', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Warte auf Seite geladen
    await page.waitForSelector('.grid-item', { timeout: 10000 });
    console.log('✅ Seite geladen\n');

    // Test 1: Lampenbild vorhanden?
    console.log('🧪 Test 1: Lampenbild wird angezeigt');
    const lampImage = await page.$('.grid-item img.lamp-icon[alt="Orange Light"]');
    if (lampImage) {
      console.log('✅ PASS: Lampenbild gefunden\n');
      
      // Screenshot
      await lampImage.screenshot({ path: 'test-results/lamp-initial.png' });
      console.log('📸 Screenshot gespeichert: test-results/lamp-initial.png\n');
    } else {
      console.log('❌ FAIL: Lampenbild NICHT gefunden\n');
      await page.screenshot({ path: 'test-results/fail-no-lamp.png', fullPage: true });
      throw new Error('Lampenbild nicht gefunden');
    }

    // Test 2: Initiale CSS-Klasse
    console.log('🧪 Test 2: Initiale CSS-Klasse');
    const initialClass = await page.evaluate(() => {
      const img = document.querySelector('.lamp-icon');
      return {
        classList: Array.from(img.classList),
        src: img.src
      };
    });
    console.log('   CSS-Klassen:', initialClass.classList);
    console.log('   Src:', initialClass.src);
    
    const isInitiallyOn = initialClass.classList.includes('on');
    const isInitiallyOff = initialClass.classList.includes('off');
    console.log(`   State: ${isInitiallyOn ? 'ON' : isInitiallyOff ? 'OFF' : 'UNAVAILABLE'}\n`);

    // Test 3: Toggle (An → Aus oder Aus → An)
    console.log('🧪 Test 3: Toggle-Funktionalität');
    console.log('   Klicke auf Orange-Light-Kachel...');
    
    const tile = await page.$('.grid-item:has(img.lamp-icon)');
    await tile.click();
    
    console.log('   Warte 1 Sekunde auf State-Update...');
    await page.waitForTimeout(1000);

    // Test 4: CSS-Klasse nach Toggle
    console.log('\n🧪 Test 4: State nach Toggle');
    const afterClass = await page.evaluate(() => {
      const img = document.querySelector('.lamp-icon');
      return Array.from(img.classList);
    });
    console.log('   CSS-Klassen nach Toggle:', afterClass);
    
    const isNowOn = afterClass.includes('on');
    const isNowOff = afterClass.includes('off');
    console.log(`   Neuer State: ${isNowOn ? 'ON' : isNowOff ? 'OFF' : 'UNAVAILABLE'}`);

    // Vergleich
    if (isInitiallyOn !== isNowOn) {
      console.log('   ✅ PASS: State hat sich geändert!\n');
      await lampImage.screenshot({ path: 'test-results/lamp-after-toggle.png' });
      console.log('   📸 Screenshot: test-results/lamp-after-toggle.png\n');
    } else {
      console.log('   ❌ FAIL: State hat sich NICHT geändert\n');
    }

    // Test 5: Nochmal togglen (zurück zum Original)
    console.log('🧪 Test 5: Toggle zurück');
    await tile.click();
    await page.waitForTimeout(1000);

    const finalClass = await page.evaluate(() => {
      const img = document.querySelector('.lamp-icon');
      return Array.from(img.classList);
    });
    console.log('   CSS-Klassen nach 2. Toggle:', finalClass);
    
    const isFinallyOn = finalClass.includes('on');
    const isFinallyOff = finalClass.includes('off');
    console.log(`   Finaler State: ${isFinallyOn ? 'ON' : isFinallyOff ? 'OFF' : 'UNAVAILABLE'}`);

    if (isInitiallyOn === isFinallyOn) {
      console.log('   ✅ PASS: Zurück zum Original-State!\n');
    } else {
      console.log('   ❌ FAIL: State nicht zurück\n');
    }

    // Test 6: WebSocket-Messages
    console.log('🧪 Test 6: WebSocket State-Updates');
    console.log(`   Empfangene WebSocket-Messages für Lampe: ${wsMessages.length}`);
    if (wsMessages.length > 0) {
      console.log('   ✅ PASS: WebSocket-Updates empfangen\n');
    } else {
      console.log('   ⚠️  WARNING: Keine WebSocket-Updates (Workaround aktiv)\n');
    }

    // Test 7: Long-Press (Details öffnen)
    console.log('🧪 Test 7: Long-Press für Details');
    await tile.click({ delay: 600 }); // Simuliert Long-Press
    await page.waitForTimeout(1000);
    
    const detailView = await page.$('app-orange-light .back-button');
    if (detailView) {
      console.log('   ✅ PASS: Detail-Ansicht geöffnet\n');
      await page.screenshot({ path: 'test-results/lamp-detail-view.png', fullPage: true });
    } else {
      console.log('   ❌ FAIL: Detail-Ansicht nicht geöffnet\n');
    }

    // Zusammenfassung
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST-ZUSAMMENFASSUNG');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Lampenbild wird angezeigt');
    console.log('✅ Toggle-Funktion aufgerufen');
    console.log(isInitiallyOn !== isNowOn ? '✅ State ändert sich visuell' : '❌ State ändert sich NICHT');
    console.log('📸 Screenshots in test-results/');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Browser offen lassen für manuelle Inspektion
    console.log('⏸️  Browser bleibt offen für manuelle Inspektion...');
    console.log('   Drücke Ctrl+C um zu beenden\n');

    // Warte unendlich (bis User Ctrl+C drückt)
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: 'test-results/error.png', fullPage: true });
    console.error('📸 Error Screenshot: test-results/error.png\n');
    await browser.close();
    process.exit(1);
  }
})();
