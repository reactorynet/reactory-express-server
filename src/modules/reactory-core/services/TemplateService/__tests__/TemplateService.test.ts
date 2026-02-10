import { ReactoryTemplateService } from '../TemplateService';
import { DEFAULT_TEMPLATE_HELPERS } from '../types';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock the context
const createMockContext = (): any => ({
  partner: {
    _id: 'test-partner-id',
    getSetting: jest.fn(),
  },
  user: {
    _id: 'test-user-id',
  },
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('ReactoryTemplateService', () => {
  let service: ReactoryTemplateService;
  let mockContext: any;
  let tempDir: string;

  beforeEach(() => {
    mockContext = createMockContext();
    service = new ReactoryTemplateService({}, mockContext);
    
    // Create a temp directory for test templates
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    // Clear cache between tests
    service.clearCache();
  });

  describe('String Rendering', () => {
    it('should render a simple EJS template string', async () => {
      const template = 'Hello, <%= name %>!';
      const result = await service.renderString(template, { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should render template with helpers', async () => {
      const template = 'Class: <%= helpers.pascalCase(name) %>';
      const result = await service.renderString(template, { name: 'my_service' });
      expect(result).toBe('Class: MyService');
    });

    it('should render template with loops', async () => {
      const template = '<% items.forEach(function(item) { %><%= item %>,<% }); %>';
      const result = await service.renderString(template, { items: ['a', 'b', 'c'] });
      expect(result).toBe('a,b,c,');
    });

    it('should render template with conditionals', async () => {
      const template = '<% if (show) { %>visible<% } else { %>hidden<% } %>';
      expect(await service.renderString(template, { show: true })).toBe('visible');
      expect(await service.renderString(template, { show: false })).toBe('hidden');
    });

    it('should handle HTML-encoded EJS tags', async () => {
      const template = 'Hello, &lt;%= name %&gt;!';
      const result = await service.renderString(template, { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should handle URL-encoded EJS tags', async () => {
      const template = 'Hello, %3C%= name %%3E!';
      const result = await service.renderString(template, { name: 'World' });
      expect(result).toBe('Hello, World!');
    });
  });

  describe('File Rendering', () => {
    it('should render a template from file', async () => {
      const templatePath = path.join(tempDir, 'test.ejs');
      fs.writeFileSync(templatePath, 'Hello, <%= name %>!');

      const result = await service.renderFile(templatePath, { name: 'File' });
      expect(result).toBe('Hello, File!');
    });

    it('should throw error for non-existent file', async () => {
      const templatePath = path.join(tempDir, 'nonexistent.ejs');
      await expect(service.renderFile(templatePath, {})).rejects.toThrow();
    });

    it('should cache compiled templates', async () => {
      const templatePath = path.join(tempDir, 'cached.ejs');
      fs.writeFileSync(templatePath, 'Hello, <%= name %>!');

      // First render - should miss cache
      await service.renderFile(templatePath, { name: 'First' });
      const stats1 = service.getCacheStats();
      expect(stats1.misses).toBe(1);
      expect(stats1.hits).toBe(0);

      // Second render - should hit cache
      await service.renderFile(templatePath, { name: 'Second' });
      const stats2 = service.getCacheStats();
      expect(stats2.hits).toBe(1);
    });

    it('should invalidate cache when file changes', async () => {
      const templatePath = path.join(tempDir, 'changing.ejs');
      fs.writeFileSync(templatePath, 'Version 1');

      // First render
      const result1 = await service.renderFile(templatePath, {});
      expect(result1).toBe('Version 1');

      // Modify file (with delay to ensure mtime changes)
      await new Promise(resolve => setTimeout(resolve, 100));
      fs.writeFileSync(templatePath, 'Version 2');

      // Second render should get new content
      const result2 = await service.renderFile(templatePath, {});
      expect(result2).toBe('Version 2');
    });

    it('should disable caching when option is false', async () => {
      const templatePath = path.join(tempDir, 'nocache.ejs');
      fs.writeFileSync(templatePath, 'Hello, <%= name %>!');

      await service.renderFile(templatePath, { name: 'First' }, { cache: false });
      await service.renderFile(templatePath, { name: 'Second' }, { cache: false });

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Template Compilation', () => {
    it('should compile a template for reuse', async () => {
      const templatePath = path.join(tempDir, 'compile.ejs');
      fs.writeFileSync(templatePath, 'Hello, <%= name %>!');

      const compiled = await service.compileTemplate(templatePath);
      
      expect(typeof compiled).toBe('function');
      expect(compiled.path).toBe(templatePath);
      expect(compiled.source).toBe('Hello, <%= name %>!');

      const result1 = await compiled({ name: 'Alice' });
      const result2 = await compiled({ name: 'Bob' });

      expect(result1).toBe('Hello, Alice!');
      expect(result2).toBe('Hello, Bob!');
    });

    it('should extract template dependencies', async () => {
      const templatePath = path.join(tempDir, 'with-include.ejs');
      fs.writeFileSync(templatePath, `
        <%- include('header.ejs') %>
        Content
        <%- include('footer.ejs', { year: 2026 }) %>
      `);

      const compiled = await service.compileTemplate(templatePath);
      expect(compiled.dependencies).toContain('header.ejs');
      expect(compiled.dependencies).toContain('footer.ejs');
    });
  });

  describe('Cache Management', () => {
    it('should clear specific cache entry', async () => {
      const templatePath1 = path.join(tempDir, 'cache1.ejs');
      const templatePath2 = path.join(tempDir, 'cache2.ejs');
      fs.writeFileSync(templatePath1, 'Template 1');
      fs.writeFileSync(templatePath2, 'Template 2');

      await service.renderFile(templatePath1, {});
      await service.renderFile(templatePath2, {});

      expect(service.getCacheStats().size).toBe(2);

      service.clearCache(templatePath1);
      expect(service.getCacheStats().size).toBe(1);
    });

    it('should clear all cache entries', async () => {
      const templatePath1 = path.join(tempDir, 'cache1.ejs');
      const templatePath2 = path.join(tempDir, 'cache2.ejs');
      fs.writeFileSync(templatePath1, 'Template 1');
      fs.writeFileSync(templatePath2, 'Template 2');

      await service.renderFile(templatePath1, {});
      await service.renderFile(templatePath2, {});

      expect(service.getCacheStats().size).toBe(2);

      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });

    it('should provide accurate cache statistics', async () => {
      const templatePath = path.join(tempDir, 'stats.ejs');
      fs.writeFileSync(templatePath, 'Hello');

      // Miss
      await service.renderFile(templatePath, {});
      // Hit
      await service.renderFile(templatePath, {});
      // Hit
      await service.renderFile(templatePath, {});

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.hitRate).toBeCloseTo(66.67, 0);
    });
  });

  describe('Helper Functions', () => {
    it('should register a custom helper', () => {
      service.registerHelper('double', (n: number) => n * 2);
      const helpers = service.getHelpers();
      expect(helpers.double).toBeDefined();
      expect(helpers.double(5)).toBe(10);
    });

    it('should register multiple helpers', () => {
      service.registerHelpers({
        add: (a: number, b: number) => a + b,
        subtract: (a: number, b: number) => a - b,
      });

      const helpers = service.getHelpers();
      expect(helpers.add(2, 3)).toBe(5);
      expect(helpers.subtract(5, 3)).toBe(2);
    });

    it('should unregister a helper', () => {
      service.registerHelper('temp', () => 'temp');
      expect(service.getHelpers().temp).toBeDefined();

      service.unregisterHelper('temp');
      expect(service.getHelpers().temp).toBeUndefined();
    });

    it('should use custom helpers in templates', async () => {
      service.registerHelper('reverse', (str: string) => str.split('').reverse().join(''));
      const result = await service.renderString('<%= helpers.reverse(text) %>', { text: 'hello' });
      expect(result).toBe('olleh');
    });

    it('should use one-time helpers in render options', async () => {
      const result = await service.renderString(
        '<%= helpers.custom(value) %>',
        { value: 'test' },
        { helpers: { custom: (s: string) => s.toUpperCase() } }
      );
      expect(result).toBe('TEST');
    });

    it('should throw error when registering non-function helper', () => {
      expect(() => service.registerHelper('bad', 'not a function' as any)).toThrow();
    });
  });

  describe('Template Directory Management', () => {
    it('should add a template directory', () => {
      service.addTemplateDirectory(tempDir, 100);
      const dirs = service.getTemplateDirectories();
      expect(dirs.some(d => d.path === tempDir && d.priority === 100)).toBe(true);
    });

    it('should remove a template directory', () => {
      service.addTemplateDirectory(tempDir, 100);
      service.removeTemplateDirectory(tempDir);
      const dirs = service.getTemplateDirectories();
      expect(dirs.some(d => d.path === tempDir)).toBe(false);
    });

    it('should resolve template path from directories', () => {
      const templatePath = path.join(tempDir, 'resolve.ejs');
      fs.writeFileSync(templatePath, 'Content');

      service.addTemplateDirectory(tempDir, 100);
      const resolved = service.resolveTemplatePath('resolve.ejs');
      expect(resolved).toBe(templatePath);
    });

    it('should resolve by priority (highest first)', () => {
      const dir1 = path.join(tempDir, 'dir1');
      const dir2 = path.join(tempDir, 'dir2');
      fs.mkdirSync(dir1);
      fs.mkdirSync(dir2);
      
      fs.writeFileSync(path.join(dir1, 'test.ejs'), 'Dir 1');
      fs.writeFileSync(path.join(dir2, 'test.ejs'), 'Dir 2');

      service.addTemplateDirectory(dir1, 50);
      service.addTemplateDirectory(dir2, 100);

      const resolved = service.resolveTemplatePath('test.ejs');
      expect(resolved).toBe(path.join(dir2, 'test.ejs'));
    });

    it('should return null for unresolvable template', () => {
      const resolved = service.resolveTemplatePath('nonexistent.ejs');
      expect(resolved).toBeNull();
    });
  });

  describe('Template Validation', () => {
    it('should validate correct template syntax', async () => {
      const templatePath = path.join(tempDir, 'valid.ejs');
      fs.writeFileSync(templatePath, 'Hello, <%= name %>!');

      const result = await service.validateTemplate(templatePath);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors', async () => {
      const templatePath = path.join(tempDir, 'invalid.ejs');
      fs.writeFileSync(templatePath, 'Hello, <%= name %');

      const result = await service.validateTemplate(templatePath);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate string templates', async () => {
      const result = await service.validateTemplate('Hello, <%= name %>!', false);
      expect(result.valid).toBe(true);
    });

    it('should extract template variables', async () => {
      const templatePath = path.join(tempDir, 'vars.ejs');
      fs.writeFileSync(templatePath, '<%= name %> <%= age %> <%= active %>');

      const result = await service.validateTemplate(templatePath);
      expect(result.variables).toContain('name');
      expect(result.variables).toContain('age');
      expect(result.variables).toContain('active');
    });

    it('should report file not found', async () => {
      const result = await service.validateTemplate('/nonexistent/path.ejs');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('Legacy renderTemplate Method', () => {
    it('should render string template (backward compatible)', () => {
      const result = service.renderTemplate('Hello, <%= name %>!', { name: 'Legacy' });
      expect(result).toBe('Hello, Legacy!');
    });

    it('should render template object with content', () => {
      const template = { content: 'Value: <%= value %>' };
      const result = service.renderTemplate(template, { value: 42 });
      expect(result).toBe('Value: 42');
    });

    it('should inject helpers in legacy method', () => {
      const result = service.renderTemplate('<%= helpers.pascalCase(name) %>', { name: 'my_class' });
      expect(result).toBe('MyClass');
    });
  });
});

describe('DEFAULT_TEMPLATE_HELPERS', () => {
  describe('pascalCase', () => {
    it('should convert to PascalCase', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.pascalCase('hello_world')).toBe('HelloWorld');
      expect(DEFAULT_TEMPLATE_HELPERS.pascalCase('my-service')).toBe('MyService');
      expect(DEFAULT_TEMPLATE_HELPERS.pascalCase('already')).toBe('Already');
    });

    it('should handle empty string', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.pascalCase('')).toBe('');
    });
  });

  describe('camelCase', () => {
    it('should convert to camelCase', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.camelCase('hello_world')).toBe('helloWorld');
      expect(DEFAULT_TEMPLATE_HELPERS.camelCase('my-service')).toBe('myService');
    });
  });

  describe('kebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.kebabCase('HelloWorld')).toBe('hello-world');
      expect(DEFAULT_TEMPLATE_HELPERS.kebabCase('myService')).toBe('my-service');
    });
  });

  describe('snakeCase', () => {
    it('should convert to snake_case', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.snakeCase('HelloWorld')).toBe('hello_world');
      expect(DEFAULT_TEMPLATE_HELPERS.snakeCase('myService')).toBe('my_service');
    });
  });

  describe('mapType', () => {
    it('should map YAML types to TypeScript', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.mapType('string')).toBe('string');
      expect(DEFAULT_TEMPLATE_HELPERS.mapType('integer')).toBe('number');
      expect(DEFAULT_TEMPLATE_HELPERS.mapType('boolean')).toBe('boolean');
      expect(DEFAULT_TEMPLATE_HELPERS.mapType('array')).toBe('any[]');
      expect(DEFAULT_TEMPLATE_HELPERS.mapType('unknown')).toBe('any');
    });
  });

  describe('indent', () => {
    it('should indent text', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.indent('hello\nworld', 2)).toBe('  hello\n  world');
    });
  });

  describe('comment', () => {
    it('should create comments in various styles', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.comment('test', 'js')).toBe('// test');
      expect(DEFAULT_TEMPLATE_HELPERS.comment('test', 'hash')).toBe('# test');
      expect(DEFAULT_TEMPLATE_HELPERS.comment('test', 'xml')).toBe('<!-- test -->');
      expect(DEFAULT_TEMPLATE_HELPERS.comment('test', 'block')).toBe('/* test */');
    });
  });

  describe('quote', () => {
    it('should quote strings', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.quote('hello', 'single')).toBe("'hello'");
      expect(DEFAULT_TEMPLATE_HELPERS.quote('hello', 'double')).toBe('"hello"');
      expect(DEFAULT_TEMPLATE_HELPERS.quote('hello', 'backtick')).toBe('`hello`');
    });

    it('should escape quotes', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.quote("it's", 'single')).toBe("'it\\'s'");
    });
  });

  describe('json', () => {
    it('should convert to JSON', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.json({ a: 1 })).toBe('{"a":1}');
      expect(DEFAULT_TEMPLATE_HELPERS.json({ a: 1 }, 2)).toBe('{\n  "a": 1\n}');
    });
  });

  describe('pluralize', () => {
    it('should pluralize words', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.pluralize('item', 1)).toBe('item');
      expect(DEFAULT_TEMPLATE_HELPERS.pluralize('item', 5)).toBe('items');
      expect(DEFAULT_TEMPLATE_HELPERS.pluralize('person', 5, 'people')).toBe('people');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(DEFAULT_TEMPLATE_HELPERS.truncate('hello world', 8)).toBe('hello...');
      expect(DEFAULT_TEMPLATE_HELPERS.truncate('short', 10)).toBe('short');
    });
  });
});
