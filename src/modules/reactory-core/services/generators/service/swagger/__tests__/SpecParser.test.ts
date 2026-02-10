import { SpecParser, SpecUtils } from '../SpecParser';
import type { OpenAPI3Spec, Swagger2Spec } from '../types';
import path from 'path';

describe('SpecParser', () => {
  describe('detectVersion', () => {
    it('should detect OpenAPI 3.0', () => {
      const spec = { openapi: '3.0.0', info: { title: 'Test', version: '1.0' }, paths: {} };
      expect(SpecParser.detectVersion(spec)).toBe('openapi-3');
    });

    it('should detect OpenAPI 3.1', () => {
      const spec = { openapi: '3.1.0', info: { title: 'Test', version: '1.0' }, paths: {} };
      expect(SpecParser.detectVersion(spec)).toBe('openapi-3');
    });

    it('should detect Swagger 2.0', () => {
      const spec = { swagger: '2.0', info: { title: 'Test', version: '1.0' }, paths: {} };
      expect(SpecParser.detectVersion(spec)).toBe('swagger-2');
    });

    it('should return unknown for invalid spec', () => {
      expect(SpecParser.detectVersion(null)).toBe('unknown');
      expect(SpecParser.detectVersion({})).toBe('unknown');
      expect(SpecParser.detectVersion({ openapi: '1.0' })).toBe('unknown');
    });
  });

  describe('validate', () => {
    it('should validate a valid OpenAPI 3.0 spec', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const result = SpecParser.validate(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid Swagger 2.0 spec', () => {
      const spec: Swagger2Spec = {
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const result = SpecParser.validate(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing info', () => {
      const spec: any = {
        openapi: '3.0.0',
        paths: {},
      };

      const result = SpecParser.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: info');
    });

    it('should fail validation for missing info.title', () => {
      const spec: any = {
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
        },
        paths: {},
      };

      const result = SpecParser.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: info.title');
    });

    it('should fail validation for missing paths', () => {
      const spec: any = {
        openapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0.0',
        },
      };

      const result = SpecParser.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid required field: paths');
    });

    it('should fail validation for empty paths', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0.0',
        },
        paths: {},
      };

      const result = SpecParser.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Specification contains no paths');
    });

    it('should fail validation for unknown version', () => {
      const spec: any = {
        info: {
          title: 'Test',
          version: '1.0.0',
        },
        paths: {
          '/test': {},
        },
      };

      const result = SpecParser.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot determine specification version (missing openapi or swagger field)');
    });
  });

  describe('getBaseURL', () => {
    it('should extract base URL from OpenAPI 3.0 spec', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        servers: [
          { url: 'https://api.example.com/v1' },
          { url: 'https://api-dev.example.com/v1' },
        ],
        paths: {},
      };

      expect(SpecParser.getBaseURL(spec)).toBe('https://api.example.com/v1');
    });

    it('should extract base URL from Swagger 2.0 spec', () => {
      const spec: Swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0' },
        host: 'api.example.com',
        basePath: '/v1',
        schemes: ['https'],
        paths: {},
      };

      expect(SpecParser.getBaseURL(spec)).toBe('https://api.example.com/v1');
    });

    it('should handle Swagger 2.0 without basePath', () => {
      const spec: Swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0' },
        host: 'api.example.com',
        schemes: ['https'],
        paths: {},
      };

      expect(SpecParser.getBaseURL(spec)).toBe('https://api.example.com');
    });

    it('should default to https for Swagger 2.0 without schemes', () => {
      const spec: Swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0' },
        host: 'api.example.com',
        paths: {},
      };

      expect(SpecParser.getBaseURL(spec)).toBe('https://api.example.com');
    });

    it('should return undefined when no base URL is specified', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
      };

      expect(SpecParser.getBaseURL(spec)).toBeUndefined();
    });
  });

  describe('resolveRef', () => {
    it('should resolve a schema reference in OpenAPI 3.0', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const resolved = SpecParser.resolveRef(spec, '#/components/schemas/User');
      expect(resolved).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      });
    });

    it('should resolve a definition reference in Swagger 2.0', () => {
      const spec: Swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
        definitions: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      };

      const resolved = SpecParser.resolveRef(spec, '#/definitions/User');
      expect(resolved).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      });
    });

    it('should return null for invalid references', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
      };

      expect(SpecParser.resolveRef(spec, '#/components/schemas/NotFound')).toBeNull();
      expect(SpecParser.resolveRef(spec, 'invalid-ref')).toBeNull();
    });
  });

  describe('getSchemas', () => {
    it('should get schemas from OpenAPI 3.0 spec', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
        components: {
          schemas: {
            User: { type: 'object' },
            Product: { type: 'object' },
          },
        },
      };

      const schemas = SpecParser.getSchemas(spec);
      expect(Object.keys(schemas)).toHaveLength(2);
      expect(schemas.User).toBeDefined();
      expect(schemas.Product).toBeDefined();
    });

    it('should get definitions from Swagger 2.0 spec', () => {
      const spec: Swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
        definitions: {
          User: { type: 'object' },
          Product: { type: 'object' },
        },
      };

      const schemas = SpecParser.getSchemas(spec);
      expect(Object.keys(schemas)).toHaveLength(2);
      expect(schemas.User).toBeDefined();
      expect(schemas.Product).toBeDefined();
    });

    it('should return empty object when no schemas are defined', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
      };

      const schemas = SpecParser.getSchemas(spec);
      expect(schemas).toEqual({});
    });
  });

  describe('getInfo', () => {
    it('should extract info from specification', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.1',
        info: {
          title: 'My API',
          version: '2.0.0',
          description: 'An example API',
        },
        paths: {},
      };

      const info = SpecParser.getInfo(spec);
      expect(info.title).toBe('My API');
      expect(info.version).toBe('2.0.0');
      expect(info.description).toBe('An example API');
      expect(info.specVersion).toBe('openapi-3');
    });
  });

  describe('countEndpoints', () => {
    it('should count all endpoints', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {
          '/users': {
            get: { responses: {} },
            post: { responses: {} },
          },
          '/users/{id}': {
            get: { responses: {} },
            put: { responses: {} },
            delete: { responses: {} },
          },
        },
      };

      expect(SpecParser.countEndpoints(spec)).toBe(5);
    });

    it('should return 0 for empty paths', () => {
      const spec: OpenAPI3Spec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {},
      };

      expect(SpecParser.countEndpoints(spec)).toBe(0);
    });
  });
});

describe('SpecUtils', () => {
  describe('sanitizeOperationId', () => {
    it('should use operation ID when provided', () => {
      expect(SpecUtils.sanitizeOperationId('getUserById', '/users/{id}', 'get')).toBe('getUserById');
    });

    it('should sanitize operation ID with special characters', () => {
      expect(SpecUtils.sanitizeOperationId('get-user-by-id', '/users/{id}', 'get')).toBe('getUserById');
    });

    it('should generate method name from path and method', () => {
      expect(SpecUtils.sanitizeOperationId(undefined, '/users', 'get')).toBe('getUsers');
      expect(SpecUtils.sanitizeOperationId(undefined, '/users', 'post')).toBe('postUsers');
    });

    it('should handle path parameters in generation', () => {
      expect(SpecUtils.sanitizeOperationId(undefined, '/users/{id}', 'get')).toBe('getUsersByid');
    });

    it('should handle complex paths', () => {
      expect(SpecUtils.sanitizeOperationId(undefined, '/users/{id}/orders/{orderId}', 'get'))
        .toBe('getUsersByidordersByorderId');
    });
  });

  describe('mapTypeToTypeScript', () => {
    it('should map integer to number', () => {
      expect(SpecUtils.mapTypeToTypeScript('integer')).toBe('number');
    });

    it('should map number to number', () => {
      expect(SpecUtils.mapTypeToTypeScript('number')).toBe('number');
    });

    it('should map string to string', () => {
      expect(SpecUtils.mapTypeToTypeScript('string')).toBe('string');
    });

    it('should map date formats to Date | string', () => {
      expect(SpecUtils.mapTypeToTypeScript('string', 'date')).toBe('Date | string');
      expect(SpecUtils.mapTypeToTypeScript('string', 'date-time')).toBe('Date | string');
    });

    it('should map boolean to boolean', () => {
      expect(SpecUtils.mapTypeToTypeScript('boolean')).toBe('boolean');
    });

    it('should map array to any[]', () => {
      expect(SpecUtils.mapTypeToTypeScript('array')).toBe('any[]');
    });

    it('should map object to Record<string, any>', () => {
      expect(SpecUtils.mapTypeToTypeScript('object')).toBe('Record<string, any>');
    });

    it('should default to any for unknown types', () => {
      expect(SpecUtils.mapTypeToTypeScript(undefined)).toBe('any');
      expect(SpecUtils.mapTypeToTypeScript('unknown')).toBe('any');
    });
  });

  describe('isSchemaRef', () => {
    it('should detect schema references', () => {
      expect(SpecUtils.isSchemaRef('#/components/schemas/User')).toBe(true);
      expect(SpecUtils.isSchemaRef('#/definitions/User')).toBe(true);
    });

    it('should reject non-schema references', () => {
      expect(SpecUtils.isSchemaRef('#/components/parameters/userId')).toBe(false);
      expect(SpecUtils.isSchemaRef('#/paths/users')).toBe(false);
    });
  });

  describe('extractSchemaName', () => {
    it('should extract schema name from reference', () => {
      expect(SpecUtils.extractSchemaName('#/components/schemas/User')).toBe('User');
      expect(SpecUtils.extractSchemaName('#/definitions/Product')).toBe('Product');
    });

    it('should handle complex namespace references', () => {
      expect(SpecUtils.extractSchemaName('#/components/schemas/WorldRemit.Loyalty.Api.Models.Domain.Referral'))
        .toBe('WorldRemit.Loyalty.Api.Models.Domain.Referral');
    });
  });
});
