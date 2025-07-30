module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testRegex: '(/__tests__/.*\\.(test|spec))\\.(ts|tsx|js)$',
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock native modules
    '^react-native$': '<rootDir>/node_modules/react-native/index.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js',
  },
  setupFiles: ['<rootDir>/jest.setup.minimal.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo-.*|@expo|@testing-library)',
  ],
};