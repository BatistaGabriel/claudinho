module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@claudinho/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testTimeout: 10000,
}
