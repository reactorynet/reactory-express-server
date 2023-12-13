/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@reactory/server-core/(.*)$': '<rootDir>/src/$1',
    '^@reactory/server-modules/(.*)$': '<rootDir>/src/modules/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
};
