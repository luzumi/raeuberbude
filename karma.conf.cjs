const { join } = require('path');
const { constants } = require('karma');

// Ensure Karma uses a Chromium binary if available; developers can override
// CHROME_BIN to point at their local Chrome installation.
process.env.CHROME_BIN = process.env.CHROME_BIN || 'chromium';

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
