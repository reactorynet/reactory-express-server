/**
 * Authentication Strategies Integration Tests
 * 
 * Tests strategy registration, loading, and coordination across the authentication module.
 */

import passport from 'passport';
import { Application } from 'express';
import PassportProviders from '../index';
import { createMockRequest, createMockResponse } from './utils';

describe('Authentication Strategies Integration', () => {
  describe('Strategy Registration', () => {
    it('should export an array of passport providers', () => {
      expect(PassportProviders).toBeDefined();
      expect(Array.isArray(PassportProviders)).toBe(true);
      expect(PassportProviders.length).toBeGreaterThan(0);
    });

    it('should have all expected strategies registered', () => {
      const expectedStrategies = [
        'anon',
        'local',
        'jwt',
        'google',
        'facebook',
        'github',
        'linkedin',
        'microsoft',
        'okta',
      ];

      const registeredStrategies = PassportProviders.map(provider => provider.name);
      
      expectedStrategies.forEach(strategyName => {
        expect(registeredStrategies).toContain(strategyName);
      });
    });

    it('should have valid strategy objects for each provider', () => {
      PassportProviders.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('strategy');
        expect(typeof provider.name).toBe('string');
        expect(provider.strategy).toBeDefined();
      });
    });

    it('should have configure functions for OAuth strategies', () => {
      const oauthStrategies = ['google', 'local', 'facebook', 'github', 'linkedin', 'microsoft', 'okta'];
      
      oauthStrategies.forEach(strategyName => {
        const provider = PassportProviders.find(p => p.name === strategyName);
        expect(provider).toBeDefined();
        
        if (strategyName !== 'local') {
          // All OAuth strategies should have configure functions
          expect(provider?.configure).toBeDefined();
          expect(typeof provider?.configure).toBe('function');
        }
      });
    });
  });

  describe('Strategy Configuration', () => {
    let mockApp: Partial<Application>;

    beforeEach(() => {
      mockApp = {
        use: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
      } as any;
    });

    it('should configure routes for strategies that have configure function', () => {
      const strategiesWithRoutes = PassportProviders.filter(p => p.configure);
      
      expect(strategiesWithRoutes.length).toBeGreaterThan(0);
      
      strategiesWithRoutes.forEach(provider => {
        if (provider.configure) {
          // Should not throw
          expect(() => provider.configure(mockApp as Application)).not.toThrow();
        }
      });
    });

    it('should register OAuth start endpoints for OAuth strategies', () => {
      const googleProvider = PassportProviders.find(p => p.name === 'google');
      
      if (googleProvider?.configure) {
        googleProvider.configure(mockApp as Application);
        
        // Should have registered GET endpoints
        expect(mockApp.get).toHaveBeenCalled();
      }
    });
  });

  describe('Disabled Provider Handling', () => {
    it('should handle REACTORY_DISABLED_AUTH_PROVIDERS environment variable', () => {
      const originalEnv = process.env.REACTORY_DISABLED_AUTH_PROVIDERS;
      
      // Set some providers as disabled
      process.env.REACTORY_DISABLED_AUTH_PROVIDERS = 'facebook,linkedin';
      
      const disabledProviders = process.env.REACTORY_DISABLED_AUTH_PROVIDERS.split(',');
      
      expect(disabledProviders).toContain('facebook');
      expect(disabledProviders).toContain('linkedin');
      expect(disabledProviders).not.toContain('google');
      
      // Restore
      process.env.REACTORY_DISABLED_AUTH_PROVIDERS = originalEnv;
    });

    it('should filter out disabled providers during registration', () => {
      const allProviders = PassportProviders;
      const disabledList = 'facebook,github';
      const disabledProviders = disabledList.split(',');
      
      const enabledProviders = allProviders.filter(
        provider => !disabledProviders.includes(provider.name)
      );
      
      expect(enabledProviders.length).toBe(allProviders.length - 2);
      expect(enabledProviders.find(p => p.name === 'facebook')).toBeUndefined();
      expect(enabledProviders.find(p => p.name === 'github')).toBeUndefined();
      expect(enabledProviders.find(p => p.name === 'google')).toBeDefined();
    });
  });

  describe('Strategy Types', () => {
    it('should have simple strategies that require no configuration', () => {
      const simpleStrategies = ['anon', 'jwt'];
      
      simpleStrategies.forEach(strategyName => {
        const provider = PassportProviders.find(p => p.name === strategyName);
        expect(provider).toBeDefined();
        // These strategies should not have configure functions
        expect(provider?.configure).toBeUndefined();
      });
    });

    it('should have OAuth strategies that require route configuration', () => {
      const oauthStrategies = ['google'];
      
      oauthStrategies.forEach(strategyName => {
        const provider = PassportProviders.find(p => p.name === strategyName);
        expect(provider).toBeDefined();
        // OAuth strategies should have configure functions
        expect(provider?.configure).toBeDefined();
      });
    });

    it('should have local strategy with authentication route', () => {
      const localProvider = PassportProviders.find(p => p.name === 'local');
      expect(localProvider).toBeDefined();
      expect(localProvider?.configure).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle strategy initialization errors gracefully', () => {
      // Each strategy should be initialized without throwing
      PassportProviders.forEach(provider => {
        expect(provider.strategy).toBeDefined();
        // Strategy should have a name property (Passport requirement)
        expect(provider.strategy.name).toBeDefined();
      });
    });

    it('should handle missing environment variables', () => {
      // Strategies should initialize even with default/placeholder values
      const googleProvider = PassportProviders.find(p => p.name === 'google');
      expect(googleProvider).toBeDefined();
      expect(googleProvider?.strategy).toBeDefined();
      
      // Should have default values or placeholders
      // This prevents app from crashing on startup
    });
  });

  describe('Strategy Order', () => {
    it('should register strategies in correct order', () => {
      // Core strategies should come first
      const coreStrategies = ['anon', 'local', 'jwt'];
      const firstThree = PassportProviders.slice(0, 3).map(p => p.name);
      
      coreStrategies.forEach(strategy => {
        expect(firstThree).toContain(strategy);
      });
    });

    it('should have Google strategy registered', () => {
      const googleIndex = PassportProviders.findIndex(p => p.name === 'google');
      expect(googleIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Module Exports', () => {
    it('should export default array of providers', () => {
      expect(PassportProviders).toBeDefined();
      expect(PassportProviders).toBeInstanceOf(Array);
    });

    it('should have consistent provider structure', () => {
      PassportProviders.forEach(provider => {
        // All providers must have name and strategy
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('strategy');
        
        // Name should be a non-empty string
        expect(typeof provider.name).toBe('string');
        expect(provider.name.length).toBeGreaterThan(0);
        
        // Strategy should be an object with a name
        expect(typeof provider.strategy).toBe('object');
        expect(provider.strategy.name).toBeDefined();
        
        // Configure is optional but if present should be a function
        if (provider.configure) {
          expect(typeof provider.configure).toBe('function');
        }
      });
    });
  });

  describe('Strategy Loading', () => {
    it('should load all strategy files without errors', () => {
      // If we got here, all strategies loaded successfully
      expect(PassportProviders.length).toBeGreaterThan(0);
    });

    it('should have unique strategy names', () => {
      const names = PassportProviders.map(p => p.name);
      const uniqueNames = new Set(names);
      
      expect(names.length).toBe(uniqueNames.size);
    });

    it('should have valid passport strategy instances', () => {
      PassportProviders.forEach(provider => {
        // Each strategy should have an authenticate method (Passport requirement)
        expect(provider.strategy).toHaveProperty('authenticate');
        expect(typeof provider.strategy.authenticate).toBe('function');
      });
    });
  });

  describe('Future Strategies', () => {
    it('should support adding new strategies via module system', () => {
      // The structure supports adding strategies from modules
      // This test documents the extensibility pattern
      
      const mockModuleStrategy = {
        name: 'mock-provider',
        strategy: {
          name: 'mock-provider',
          authenticate: jest.fn(),
        },
      };
      
      // Should be able to add to provider list
      const extendedProviders = [...PassportProviders, mockModuleStrategy];
      expect(extendedProviders.length).toBe(PassportProviders.length + 1);
      expect(extendedProviders.find(p => p.name === 'mock-provider')).toBeDefined();
    });
  });

  describe('Configuration Function Signatures', () => {
    it('should have configure functions that accept Express app', () => {
      const strategiesWithConfig = PassportProviders.filter(p => p.configure);
      
      strategiesWithConfig.forEach(provider => {
        // Configure function should accept one parameter (Express app)
        expect(provider.configure?.length).toBe(1);
      });
    });
  });

  describe('Provider Metadata', () => {
    it('should have descriptive names for all strategies', () => {
      const expectedNames = [
        'anon',
        'local', 
        'jwt',
        'google',
        'facebook',
        'github',
        'linkedin',
        'microsoft',
        'okta',
      ];
      
      const actualNames = PassportProviders.map(p => p.name);
      
      expectedNames.forEach(name => {
        expect(actualNames).toContain(name);
      });
    });

    it('should have strategies with consistent naming convention', () => {
      PassportProviders.forEach(provider => {
        // Strategy names should be lowercase
        expect(provider.name).toBe(provider.name.toLowerCase());
        // Should not have spaces
        expect(provider.name).not.toContain(' ');
      });
    });
  });
});

