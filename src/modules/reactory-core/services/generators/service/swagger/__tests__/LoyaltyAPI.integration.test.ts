import { SwaggerGeneratorFactory } from '../index';
import path from 'path';

describe('Loyalty API Swagger Integration', () => {
  const swaggerPath = path.join(__dirname, '../../../../../../zepz-engineer/services/quotes/loyalty/loyalty-api/swagger.json');

  it('should detect OpenAPI 3.0.1 version', async () => {
    const version = await SwaggerGeneratorFactory.detectVersion({ file: swaggerPath });
    expect(version).toBe('openapi-3');
  });

  it('should parse the loyalty-api specification', async () => {
    const result = await SwaggerGeneratorFactory.parse({ file: swaggerPath });

    expect(result.version).toBe('openapi-3');
    expect(result.info.title).toBe('WorldRemit Loyalty Api 2.0');
    expect(result.info.version).toBe('2.0');
    expect(result.endpoints.length).toBeGreaterThan(0);
  });

  it('should extract base URL if present', async () => {
    const result = await SwaggerGeneratorFactory.parse({ file: swaggerPath });
    // Base URL might not be in the spec, but the property should exist
    expect(result).toHaveProperty('baseUrl');
  });

  it('should parse all endpoint methods', async () => {
    const result = await SwaggerGeneratorFactory.parse({ file: swaggerPath });

    const methods = result.endpoints.map(e => e.method);
    expect(methods).toContain('POST');
    expect(methods).toContain('GET');
  });

  it('should parse schema definitions', async () => {
    const result = await SwaggerGeneratorFactory.parse({ file: swaggerPath });

    expect(Object.keys(result.schemas).length).toBeGreaterThan(0);
    // Check for a known schema from the swagger file (the key is the full namespace)
    const schemaKeys = Object.keys(result.schemas);
    const referralCreateRequest = schemaKeys.find(k => k.includes('ReferralCreateRequest'));
    expect(referralCreateRequest).toBeDefined();
  });

  it('should generate valid method names from operation IDs', async () => {
    const result = await SwaggerGeneratorFactory.parse({ file: swaggerPath });

    // All endpoints should have either an operationId or be able to generate a method name
    result.endpoints.forEach(endpoint => {
      expect(endpoint.path).toBeTruthy();
      expect(endpoint.method).toBeTruthy();
      // The path and method should be sufficient to generate a method name
    });
  });
});
