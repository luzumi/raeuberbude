const { join } = require('node:path');
const { constants } = require('karma');
const { execSync } = require('node:child_process');

// Auto-detect available Chrome/Chromium binary
function findChromeBinary() {
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/chrome',
  ];

  // Check if CHROME_BIN is already set and valid
  if (process.env.CHROME_BIN) {
    try {
      execSync(`test -x "${process.env.CHROME_BIN}"`, { stdio: 'ignore' });
      return process.env.CHROME_BIN;
    } catch {
      console.warn(`CHROME_BIN=${process.env.CHROME_BIN} is not executable, trying alternatives...`);
    }
  }

  // Try to find an available binary
  for (const candidate of candidates) {
    try {
      execSync(`test -x "${candidate}"`, { stdio: 'ignore' });
      console.log(`Using Chrome binary: ${candidate}`);
      return candidate;
    } catch {
      // Continue to next candidate
    }
  }

  // Try using 'which' command as fallback
  try {
    const chromePath = execSync('which google-chrome || which chromium || which chromium-browser', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (chromePath) {
      console.log(`Found Chrome via 'which': ${chromePath}`);
      return chromePath;
    }
  } catch {
    // Fallback failed
  }

  console.warn('No Chrome/Chromium binary found. Tests may fail.');
  return null;
}

// Set CHROME_BIN if we found a valid binary
const chromeBinary = findChromeBinary();
if (chromeBinary) {
  process.env.CHROME_BIN = chromeBinary;
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      clearContext: false,
      // Increase Jasmine timeout in the browser environment so async tests have more headroom
      jasmine: {
        timeoutInterval: 60000
      }
    },
    // Increase browser timeouts to avoid disconnects in slow CI or headless environments
    browserDisconnectTimeout: 60000,
    browserNoActivityTimeout: 120000,
    captureTimeout: 120000,
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: constants.LOG_INFO,
    autoWatch: false,
    browsers: chromeBinary ? ['ChromeHeadless'] : ['FirefoxHeadless'],
    singleRun: true,
    restartOnFileChange: false,
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--remote-debugging-port=9222',
        ],
      },
    },
  });
};
