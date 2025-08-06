import setupTestEnvironment from './testEnvironment';

/**
 * Jest Setup for DSL Tests
 * 
 * This file is automatically loaded by Jest before running tests.
 * It configures the test environment to ensure all DSL tests can run
 * independently without external dependencies.
 */

// Set up test environment before all tests
beforeAll(() => {
  setupTestEnvironment();
});

// Clean up after all tests
afterAll(() => {
  // Any cleanup needed after all tests
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test configuration
global.console = {
  ...console,
  // Uncomment to see console output during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
  // debug: jest.fn(),
}; 