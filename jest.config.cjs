module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
  moduleNameMapper: {
    '^@reactory/server-core/(.*)$': '<rootDir>/src/$1',
    '^@reactory/server-modules/(.*)$': '<rootDir>/src/modules/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
};
