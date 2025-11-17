import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Test Environment Setup for DSL
 * 
 * This file configures the test environment to ensure all DSL tests can run
 * independently without external dependencies.
 */

// Set up test environment variables
const setupTestEnvironment = () => {
  // Set APP_DATA_ROOT to a temporary test directory
  const testDataRoot = join(__dirname, '../../../test-data');
  
  if (!process.env.APP_DATA_ROOT) {
    process.env.APP_DATA_ROOT = testDataRoot;
  }
  
  // Create necessary directories if they don't exist
  const requiredDirs = [
    testDataRoot,
    join(testDataRoot, 'logging'),
    join(testDataRoot, 'templates'),
    join(testDataRoot, 'organization'),
    join(testDataRoot, 'profiles'),
    join(testDataRoot, 'fonts'),
    join(testDataRoot, 'i18n'),
    join(testDataRoot, 'workflows'),
    join(testDataRoot, 'builds'),
    join(testDataRoot, 'pdf'),
    join(testDataRoot, 'themes'),
  ];
  
  requiredDirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
  
  // Set other required environment variables
  process.env.NODE_ENV = 'test';
  process.env.REACTORY_IS_BUILDING = 'false';
  process.env.CDN_ROOT = 'http://localhost:3000/cdn';
  process.env.WEBROOT = 'http://localhost:3000';
  
  // Mock console methods to avoid noise in tests
  const originalConsole = { ...console };
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
  
  // Return cleanup function
  return () => {
    // Restore original console methods
    Object.assign(console, originalConsole);
  };
};

export default setupTestEnvironment; 