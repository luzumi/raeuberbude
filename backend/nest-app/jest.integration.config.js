module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/*.spec.ts','**/test/**/*.spec.ts', '**/test/**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 60000,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  roots: ['<rootDir>/test'],
  preset: 'ts-jest',
}

