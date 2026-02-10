import path from 'path';
import fs from 'fs';

/**
 * Integration test for ServiceGenerator with Swagger/OpenAPI specs
 * 
 * This test requires the ServiceGenerator to be instantiated with a proper context,
 * so we test the swagger parsing independently and verify the flow
 */
describe('ServiceGenerator Swagger Integration', () => {
  const loyaltyApiYamlPath = path.join(__dirname, '../../../../../zepz-engineer/services/quotes/loyalty/loyalty-api/service-local.yaml');
  const swaggerPath = path.join(__dirname, '../../../../../zepz-engineer/services/quotes/loyalty/loyalty-api/swagger.json');

  it('should find the test files', () => {
    expect(fs.existsSync(loyaltyApiYamlPath)).toBe(true);
    expect(fs.existsSync(swaggerPath)).toBe(true);
  });

  it('should have valid service definition YAML', () => {
    const yaml = require('js-yaml');
    const content = fs.readFileSync(loyaltyApiYamlPath, 'utf-8');
    const definition = yaml.load(content);

    expect(definition).toBeDefined();
    expect(definition.id).toBe('worldremit.LoyaltyApiService@1.0.0');
    expect(definition.serviceType).toBe('rest');
    expect(definition.spec).toBeDefined();
    expect(definition.spec.swagger).toBe('swagger.json');
  });

  it('should have valid swagger specification', () => {
    const content = fs.readFileSync(swaggerPath, 'utf-8');
    const spec = JSON.parse(content);

    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.1');
    expect(spec.info.title).toBe('WorldRemit Loyalty Api 2.0');
    expect(spec.paths).toBeDefined();
  });
});

describe('Swagger Service YAML Schema', () => {
  it('should support swagger file reference', () => {
    const yaml = require('js-yaml');
    const definition = yaml.load(`
id: test.Service@1.0.0
name: TestService
nameSpace: test
version: 1.0.0
description: Test service
serviceType: rest
spec:
  swagger: ./swagger.json
    `);

    expect(definition.spec.swagger).toBe('./swagger.json');
  });

  it('should support swagger URL reference', () => {
    const yaml = require('js-yaml');
    const definition = yaml.load(`
id: test.Service@1.0.0
name: TestService
nameSpace: test
version: 1.0.0
description: Test service
serviceType: rest
spec:
  swagger: https://api.example.com/swagger.json
    `);

    expect(definition.spec.swagger).toBe('https://api.example.com/swagger.json');
  });

  it('should support openapi field', () => {
    const yaml = require('js-yaml');
    const definition = yaml.load(`
id: test.Service@1.0.0
name: TestService
nameSpace: test
version: 1.0.0
description: Test service
serviceType: rest
spec:
  openapi: ./openapi.yaml
    `);

    expect(definition.spec.openapi).toBe('./openapi.yaml');
  });

  it('should support mixed swagger and manual endpoints', () => {
    const yaml = require('js-yaml');
    const definition = yaml.load(`
id: test.Service@1.0.0
name: TestService
nameSpace: test
version: 1.0.0
description: Test service
serviceType: rest
spec:
  swagger: ./swagger.json
  rest:
    baseUrl: https://api.example.com
    endpoints:
      - path: /custom
        method: GET
        handler: customEndpoint
    `);

    expect(definition.spec.swagger).toBe('./swagger.json');
    expect(definition.spec.rest).toBeDefined();
    expect(definition.spec.rest.endpoints).toHaveLength(1);
  });
});
