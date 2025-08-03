const { join } = require('path');
const { constants } = require('karma');

// Use jsdom to emulate a browser environment without external dependencies.
// This avoids missing system libraries required by Chromium in the container.

module.exports = function (config) {
  config.set({
    basePath: '',
    // The Angular 20 builder handles compilation, so only Jasmine is needed.
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-jsdom-launcher'), // run tests in jsdom
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
    browsers: ['jsdom'], // use lightweight jsdom instead of Chrome
    singleRun: true,
    restartOnFileChange: false,
  });
};
