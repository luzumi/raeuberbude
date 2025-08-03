const { join } = require('path');
const { constants } = require('karma');
const puppeteer = require('puppeteer');

// Use Puppeteer to supply a Chromium binary for Karma.
// Developers can still override CHROME_BIN to use a local installation.
process.env.CHROME_BIN = process.env.CHROME_BIN || puppeteer.executablePath(); // use Puppeteer Chromium for tests

module.exports = function (config) {
  config.set({
    basePath: '',
    // The Angular 20 builder handles compilation, so only Jasmine is needed.
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
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
    browsers: ['ChromeHeadless'],
    singleRun: true,
    restartOnFileChange: false,
  });
};
