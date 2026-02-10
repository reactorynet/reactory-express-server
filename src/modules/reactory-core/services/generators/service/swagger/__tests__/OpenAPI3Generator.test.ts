import { OpenAPI3Generator } from '../OpenAPI3Generator';
import type { OpenAPI3Spec } from '../types';

describe('OpenAPI3Generator', () => {
  const createBasicSpec = (): OpenAPI3Spec => ({
    openapi: '3.0.1',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {},
  });

  describe('parse', () => {
    it('should parse a simple GET endpoint', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              summary: 'Get all users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      expect(result.version).toBe('openapi-3');
      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].path).toBe('/users');
      expect(result.endpoints[0].method).toBe('GET');
      expect(result.endpoints[0].operationId).toBe('getUsers');
      expect(result.endpoints[0].summary).toBe('Get all users');
    });

    it('should parse parameters correctly', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users/{id}': {
            get: {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                },
                {
                  name: 'include',
                  in: 'query',
                  schema: { type: 'string' },
                },
              ],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      expect(result.endpoints[0].parameters).toHaveLength(2);
      expect(result.endpoints[0].parameters[0].name).toBe('id');
      expect(result.endpoints[0].parameters[0].in).toBe('path');
      expect(result.endpoints[0].parameters[0].required).toBe(true);
      expect(result.endpoints[0].parameters[0].type).toBe('string');
      
      expect(result.endpoints[0].parameters[1].name).toBe('include');
      expect(result.endpoints[0].parameters[1].in).toBe('query');
      expect(result.endpoints[0].parameters[1].required).toBe(false);
    });

    it('should parse request body correctly', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users': {
            post: {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
              responses: {
                '201': { description: 'Created' },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      expect(result.endpoints[0].requestBody).toBeDefined();
      expect(result.endpoints[0].requestBody?.required).toBe(true);
      expect(result.endpoints[0].requestBody?.contentType).toBe('application/json');
      expect(result.endpoints[0].requestBody?.schema).toBeDefined();
    });

    it('should parse multiple responses', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users/{id}': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: { type: 'object' },
                    },
                  },
                },
                '404': {
                  description: 'Not Found',
                },
                '500': {
                  description: 'Server Error',
                },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      expect(Object.keys(result.endpoints[0].responses)).toHaveLength(3);
      expect(result.endpoints[0].responses['200']).toBeDefined();
      expect(result.endpoints[0].responses['404']).toBeDefined();
      expect(result.endpoints[0].responses['500']).toBeDefined();
    });

    it('should handle path-level parameters', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users/{id}': {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            get: {
              parameters: [
                {
                  name: 'include',
                  in: 'query',
                  schema: { type: 'string' },
                },
              ],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      // Should have both path and operation parameters
      expect(result.endpoints[0].parameters).toHaveLength(2);
    });

    it('should skip deprecated endpoints when configured', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users': {
            get: {
              deprecated: true,
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
          '/products': {
            get: {
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec, { includeDeprecated: false });
      const result = generator.parse();

      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].path).toBe('/products');
    });

    it('should filter endpoints by tags', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
          '/products': {
            get: {
              tags: ['Products'],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec, { filterTags: ['Users'] });
      const result = generator.parse();

      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].path).toBe('/users');
    });

    it('should parse schemas from components', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/test': {
            get: {
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            Product: {
              type: 'object',
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      expect(Object.keys(result.schemas)).toHaveLength(2);
      expect(result.schemas.User).toBeDefined();
      expect(result.schemas.Product).toBeDefined();
    });

    it('should detect authentication requirements', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        security: [{ bearerAuth: [] }],
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      expect(result.endpoints[0].authentication).toBe(true);
    });

    it('should extract base URL from servers', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        servers: [
          { url: 'https://api.example.com/v1' },
        ],
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

      const generator = new OpenAPI3Generator(spec);
      const result = generator.parse();

      expect(result.baseUrl).toBe('https://api.example.com/v1');
    });
  });

  describe('getTags', () => {
    it('should extract all unique tags', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        paths: {
          '/users': {
            get: {
              tags: ['Users', 'Public'],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
          '/products': {
            get: {
              tags: ['Products'],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
          '/orders': {
            get: {
              tags: ['Orders', 'Public'],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const tags = generator.getTags();

      expect(tags).toHaveLength(4);
      expect(tags).toContain('Users');
      expect(tags).toContain('Products');
      expect(tags).toContain('Orders');
      expect(tags).toContain('Public');
    });
  });

  describe('getStats', () => {
    it('should return specification statistics', () => {
      const spec: OpenAPI3Spec = {
        ...createBasicSpec(),
        servers: [
          { url: 'https://api.example.com' },
        ],
        paths: {
          '/users': {
            get: {
              tags: ['Users'],
              responses: {
                '200': { description: 'Success' },
              },
            },
            post: {
              tags: ['Users'],
              responses: {
                '201': { description: 'Created' },
              },
            },
          },
        },
        components: {
          schemas: {
            User: { type: 'object' },
            Product: { type: 'object' },
          },
        },
      };

      const generator = new OpenAPI3Generator(spec);
      const stats = generator.getStats();

      expect(stats.version).toBe('3.0.1');
      expect(stats.title).toBe('Test API');
      expect(stats.apiVersion).toBe('1.0.0');
      expect(stats.endpointCount).toBe(2);
      expect(stats.schemaCount).toBe(2);
      expect(stats.tagCount).toBe(1);
      expect(stats.serverCount).toBe(1);
    });
  });
});
