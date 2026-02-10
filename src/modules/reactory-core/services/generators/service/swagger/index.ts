/**
 * OpenAPI/Swagger Specification Parser and Generators
 * 
 * This module provides tools for parsing OpenAPI 3.x and Swagger 2.0 specifications
 * and converting them into service endpoint definitions for code generation.
 */

export * from './types';
export { SpecParser, SpecUtils } from './SpecParser';
export { OpenAPI3Generator } from './OpenAPI3Generator';
export { Swagger2Generator } from './Swagger2Generator';

import { SpecParser } from './SpecParser';
import { OpenAPI3Generator } from './OpenAPI3Generator';
import { Swagger2Generator } from './Swagger2Generator';
import type { OpenAPISpec, ParsedSpec, SpecSource, SpecParserOptions, SpecVersion } from './types';

/**
 * Factory class for creating the appropriate generator based on spec version
 */
export class SwaggerGeneratorFactory {
  /**
   * Create a generator for the given specification
   */
  static async createGenerator(
    source: SpecSource,
    options: SpecParserOptions = {}
  ): Promise<OpenAPI3Generator | Swagger2Generator> {
    // Load the specification
    const spec = await SpecParser.loadSpec(source);

    // Validate the specification
    const validation = SpecParser.validate(spec);
    if (!validation.valid) {
      throw new Error(`Invalid specification: ${validation.errors.join(', ')}`);
    }

    // Detect version and create appropriate generator
    const version = SpecParser.detectVersion(spec);

    switch (version) {
      case 'openapi-3':
        return new OpenAPI3Generator(spec as any, options);
      
      case 'swagger-2':
        return new Swagger2Generator(spec as any, options);
      
      default:
        throw new Error(`Unsupported specification version: ${version}`);
    }
  }

  /**
   * Parse a specification from any source
   */
  static async parse(
    source: SpecSource,
    options: SpecParserOptions = {}
  ): Promise<ParsedSpec> {
    const generator = await this.createGenerator(source, options);
    return generator.parse();
  }

  /**
   * Detect the version of a specification without fully parsing it
   */
  static async detectVersion(source: SpecSource): Promise<SpecVersion> {
    const spec = await SpecParser.loadSpec(source);
    return SpecParser.detectVersion(spec);
  }
}
