/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/types/**/*.ts'
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
}; 