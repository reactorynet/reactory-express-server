import type {
  OpenAPISpec,
  OpenAPI3Spec,
  Swagger2Spec,
  SpecVersion,
  SpecSource,
  ParsedSpec,
  SpecParserOptions,
} from './types';
import fs from 'fs';
import path from 'path';

/**
 * OpenAPI/Swagger Specification Parser
 * 
 * Detects specification version and provides utilities for parsing
 */
export class SpecParser {
  /**
   * Detect the version of an OpenAPI/Swagger specification
   */
  static detectVersion(spec: any): SpecVersion {
    if (!spec || typeof spec !== 'object') {
      return 'unknown';
    }

    // Check for OpenAPI 3.x
    if (spec.openapi && typeof spec.openapi === 'string') {
      const version = spec.openapi;
      if (version.startsWith('3.0') || version.startsWith('3.1')) {
        return 'openapi-3';
      }
    }

    // Check for Swagger 2.0
    if (spec.swagger && spec.swagger === '2.0') {
      return 'swagger-2';
    }

    return 'unknown';
  }

  /**
   * Load specification from a source
   */
  static async loadSpec(source: SpecSource): Promise<OpenAPISpec> {
    // If spec is provided directly
    if (source.spec) {
      return source.spec;
    }

    // Load from file
    if (source.file) {
      return this.loadFromFile(source.file);
    }

    // Load from URL
    if (source.url) {
      return this.loadFromURL(source.url);
    }

    throw new Error('No valid spec source provided (file, url, or spec object required)');
  }

  /**
   * Load specification from a file
   */
  static loadFromFile(filePath: string): OpenAPISpec {
    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Specification file not found: ${resolvedPath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const ext = path.extname(resolvedPath).toLowerCase();

    try {
      if (ext === '.json') {
        return JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        // We'll use js-yaml which should be available
        const yaml = require('js-yaml');
        return yaml.load(content) as OpenAPISpec;
      } else {
        // Try JSON first, then YAML
        try {
          return JSON.parse(content);
        } catch {
          const yaml = require('js-yaml');
          return yaml.load(content) as OpenAPISpec;
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse specification file: ${error.message}`);
    }
  }

  /**
   * Load specification from a URL
   */
  static async loadFromURL(url: string): Promise<OpenAPISpec> {
    try {
      // Use node-fetch or the native fetch if available
      let fetch: any;
      try {
        fetch = globalThis.fetch;
      } catch {
        fetch = require('node-fetch');
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType.includes('yaml') || contentType.includes('yml')) {
        const text = await response.text();
        const yaml = require('js-yaml');
        return yaml.load(text) as OpenAPISpec;
      } else {
        // Try to parse as JSON first
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          const yaml = require('js-yaml');
          return yaml.load(text) as OpenAPISpec;
        }
      }
    } catch (error) {
      throw new Error(`Failed to load specification from URL: ${error.message}`);
    }
  }

  /**
   * Validate that a specification is well-formed
   */
  static validate(spec: OpenAPISpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required fields based on version
    const version = this.detectVersion(spec);

    if (version === 'unknown') {
      errors.push('Cannot determine specification version (missing openapi or swagger field)');
      return { valid: false, errors };
    }

    // Check info
    if (!spec.info) {
      errors.push('Missing required field: info');
    } else {
      if (!spec.info.title) {
        errors.push('Missing required field: info.title');
      }
      if (!spec.info.version) {
        errors.push('Missing required field: info.version');
      }
    }

    // Check paths
    if (!spec.paths || typeof spec.paths !== 'object') {
      errors.push('Missing or invalid required field: paths');
    } else if (Object.keys(spec.paths).length === 0) {
      errors.push('Specification contains no paths');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract base URL from specification
   */
  static getBaseURL(spec: OpenAPISpec): string | undefined {
    const version = this.detectVersion(spec);

    if (version === 'openapi-3') {
      const openapi3 = spec as OpenAPI3Spec;
      if (openapi3.servers && openapi3.servers.length > 0) {
        return openapi3.servers[0].url;
      }
    } else if (version === 'swagger-2') {
      const swagger2 = spec as Swagger2Spec;
      if (swagger2.host) {
        const scheme = swagger2.schemes?.[0] || 'https';
        const basePath = swagger2.basePath || '';
        return `${scheme}://${swagger2.host}${basePath}`;
      }
    }

    return undefined;
  }

  /**
   * Resolve a $ref pointer within a specification
   */
  static resolveRef(spec: OpenAPISpec, ref: string): any {
    if (!ref || !ref.startsWith('#/')) {
      return null;
    }

    const parts = ref.substring(2).split('/');
    let current: any = spec;

    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return null;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Get all schemas from a specification
   */
  static getSchemas(spec: OpenAPISpec): Record<string, any> {
    const version = this.detectVersion(spec);

    if (version === 'openapi-3') {
      const openapi3 = spec as OpenAPI3Spec;
      return openapi3.components?.schemas || {};
    } else if (version === 'swagger-2') {
      const swagger2 = spec as Swagger2Spec;
      return swagger2.definitions || {};
    }

    return {};
  }

  /**
   * Get specification info
   */
  static getInfo(spec: OpenAPISpec) {
    return {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      specVersion: this.detectVersion(spec),
    };
  }

  /**
   * Count endpoints in specification
   */
  static countEndpoints(spec: OpenAPISpec): number {
    let count = 0;
    
    for (const pathItem of Object.values(spec.paths || {})) {
      if (pathItem.get) count++;
      if (pathItem.post) count++;
      if (pathItem.put) count++;
      if (pathItem.patch) count++;
      if (pathItem.delete) count++;
      if (pathItem.options) count++;
      if (pathItem.head) count++;
      if (pathItem.trace) count++;
    }

    return count;
  }
}

/**
 * Utility functions for specification parsing
 */
export class SpecUtils {
  /**
   * Sanitize operation ID to create a valid TypeScript method name
   */
  static sanitizeOperationId(operationId: string | undefined, path: string, method: string): string {
    if (operationId) {
      // Remove non-alphanumeric characters and convert to camelCase
      return operationId
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    // Generate from path and method
    const pathParts = path
      .split('/')
      .filter(Boolean)
      .map(part => {
        // Remove path parameters
        if (part.startsWith('{') && part.endsWith('}')) {
          return 'By' + part.slice(1, -1).replace(/[^a-zA-Z0-9]/g, '');
        }
        return part.replace(/[^a-zA-Z0-9]/g, '');
      });

    const methodName = method.toLowerCase();
    const resourceName = pathParts.join('');

    return `${methodName}${resourceName.charAt(0).toUpperCase()}${resourceName.slice(1)}`;
  }

  /**
   * Convert OpenAPI type to TypeScript type
   */
  static mapTypeToTypeScript(type: string | undefined, format?: string): string {
    if (!type) return 'any';

    switch (type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'string':
        if (format === 'date' || format === 'date-time') {
          return 'Date | string';
        }
        return 'string';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'any[]';
      case 'object':
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }

  /**
   * Check if a reference is a schema reference
   */
  static isSchemaRef(ref: string): boolean {
    return ref.includes('/schemas/') || ref.includes('/definitions/');
  }

  /**
   * Extract schema name from reference
   */
  static extractSchemaName(ref: string): string {
    const parts = ref.split('/');
    return parts[parts.length - 1];
  }
}
