import type { Config } from 'jest'

const config: Config = {
  globalSetup: './global-setup.ts',
  testMatch: ['**/test/integration/**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@claudinho/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
}

export default config
