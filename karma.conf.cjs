const { join } = require('path');
const { constants } = require('karma');

// Run tests in a lightweight DOM environment to avoid external browser dependencies.
// Developers may switch to ChromeHeadless locally if they need full browser features.

module.exports = function (config) {
  config.set({
    basePath: '',
    // The Angular 20 builder handles compilation, so only Jasmine is needed.
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-jsdom-launcher'),
      // Include Chrome launcher so developers can easily switch to a real browser.
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      // jasmine: {},
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
    browsers: ['jsdom'], // Default to jsdom to keep the test setup browserless
    singleRun: true,
    restartOnFileChange: false,

  });
};
