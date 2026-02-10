import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';
import ejs from 'ejs';
import lodash from 'lodash';
import Reactory from '@reactory/reactory-core';
import { TemplateType } from '@reactory/server-core/types/constants';
import ApiError, { RecordNotFoundError } from '@reactory/server-core/exceptions';
import { Template } from '@reactory/server-modules/reactory-core/models';
import logger from '@reactory/server-core/logging';
import { ObjectId } from 'mongodb';
import { service } from '@reactory/server-core/application/decorators';
import {
  TemplateRenderOptions,
  CompiledTemplate,
  TemplateCacheEntry,
  TemplateCacheStats,
  TemplateHelperFunction,
  TemplateDirectory,
  TemplateValidationResult,
  IEnhancedTemplateService,
  DEFAULT_TEMPLATE_HELPERS,
} from './types';

const {
  APP_DATA_ROOT
} = process.env;

function replaceAll(target: string, search: string, replacement: string): string {
  return target.replace(new RegExp(search, 'g'), replacement);
}

/**
 * Sanitize EJS template string by replacing HTML-encoded EJS tags
 */
function sanitizeTemplateString(templateString: string): string {
  let result = templateString;
  // Replace HTML-encoded EJS tags
  result = replaceAll(replaceAll(result, '&lt;%=', '<%='), '%&gt;', '%>');
  result = replaceAll(replaceAll(result, '%3C%=', '<%='), '%%3E', '%>');
  result = replaceAll(replaceAll(result, '&lt;%', '<%'), '&lt;%-', '<%-');
  return result;
}

const extractEmailSections = (template: Reactory.Models.ITemplateDocument): Reactory.Models.IEmailTemplate => {
  const extracted: Reactory.Models.IEmailTemplate = {
    id: template.id || template._id,
    client: template.client,
    businessUnit: template.businessUnit,
    organization: template.organization,
    name: template.name,
    visiblity: template.visiblity,
    description: template.description,
    userId: template.userId,
    view: template.view,
    subject: '',
    body: '',
    signature: ''
  };

  if (lodash.isNil(template.elements) === false && lodash.isArray(template.elements) === true) {
    template.elements.forEach((templateElement) => {
      logger.debug(`Checking template element view: ${templateElement.view}`);
      if (templateElement.view.endsWith('/subject')) extracted.subject = templateElement.content;
      if (templateElement.view.endsWith('/body')) extracted.body = templateElement.content;
      if (templateElement.view.endsWith('/signature')) extracted.signature = templateElement.content;
    });
  }

  logger.debug(`Extracted Template ${template.name} [${template.view}]`);

  return extracted;
};

@service({
  id: 'core.TemplateService@1.0.0',
  nameSpace: 'core',
  name: 'TemplateService',
  version: '1.0.0',
  description: 'Enhanced Reactory Template Service for rendering EJS templates with caching, helpers, and code generation support.',
  dependencies: [],
  serviceType: 'template',
  secondaryTypes: ['file', 'workflow', 'development', 'codeGeneration'],
})
export class ReactoryTemplateService implements IEnhancedTemplateService {

  name: string = 'TemplateService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  context: Reactory.Server.IReactoryContext;

  /** Template cache for compiled templates */
  private readonly templateCache: Map<string, TemplateCacheEntry> = new Map();

  /** Cache statistics */
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  /** Registered helper functions */
  private helpers: Record<string, TemplateHelperFunction> = { ...DEFAULT_TEMPLATE_HELPERS };

  /** Template directories for resolution */
  private templateDirectories: TemplateDirectory[] = [];

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;

    // Add default template directories
    if (APP_DATA_ROOT) {
      this.addTemplateDirectory(path.join(APP_DATA_ROOT, 'templates'), 50);
      this.addTemplateDirectory(path.join(APP_DATA_ROOT, 'templates', 'email'), 40);
    }
  }

  // ============================================
  // Enhanced File-Based Template Methods
  // ============================================

  /**
   * Render a template from a file path
   * @param templatePath - Absolute or relative path to the template file
   * @param data - Data object to pass to template
   * @param options - Rendering options
   */
  async renderFile(
    templatePath: string,
    data: any,
    options: TemplateRenderOptions = {}
  ): Promise<string> {
    const resolvedPath = this.resolveTemplatePath(templatePath) || templatePath;

    if (!existsSync(resolvedPath)) {
      throw new RecordNotFoundError(`Template file not found: ${resolvedPath}`, 'TEMPLATE_FILE_NOT_FOUND');
    }

    // Check cache first
    if (options.cache !== false) {
      const cached = this.getCachedTemplate(resolvedPath);
      if (cached) {
        this.cacheHits++;
        const renderData = this.prepareRenderData(data, options);
        return await cached.compiled(renderData);
      }
      this.cacheMisses++;
    }

    // Load and compile template
    const templateString = readFileSync(resolvedPath, options.encoding || 'utf8');
    const sanitized = sanitizeTemplateString(templateString);

    const compiled = await this.compileTemplateString(sanitized, {
      ...options,
      filename: resolvedPath,
    });

    // Cache the compiled template
    if (options.cache !== false) {
      this.cacheTemplate(resolvedPath, compiled, templateString.length);
    }

    const renderData = this.prepareRenderData(data, options);
    return await compiled(renderData);
  }

  /**
   * Render a template from a string with full async support
   * @param templateString - EJS template string
   * @param data - Data object to pass to template
   * @param options - Rendering options
   */
  async renderString(
    templateString: string,
    data: any,
    options: TemplateRenderOptions = {}
  ): Promise<string> {
    const sanitized = sanitizeTemplateString(templateString);
    const compiled = await this.compileTemplateString(sanitized, options);
    const renderData = this.prepareRenderData(data, options);
    return await compiled(renderData);
  }

  /**
   * Pre-compile a template for efficient reuse
   * @param templatePath - Path to template file
   * @param cacheKey - Optional custom cache key
   */
  async compileTemplate(
    templatePath: string,
    cacheKey?: string
  ): Promise<CompiledTemplate> {
    const resolvedPath = this.resolveTemplatePath(templatePath) || templatePath;
    const key = cacheKey || resolvedPath;

    if (!existsSync(resolvedPath)) {
      throw new RecordNotFoundError(`Template file not found: ${resolvedPath}`, 'TEMPLATE_FILE_NOT_FOUND');
    }

    // Check cache first
    const cached = this.getCachedTemplate(key);
    if (cached) {
      this.cacheHits++;
      return cached.compiled;
    }
    this.cacheMisses++;

    // Load and compile
    const templateString = readFileSync(resolvedPath, 'utf8');
    const sanitized = sanitizeTemplateString(templateString);

    const compiled = await this.compileTemplateString(sanitized, {
      filename: resolvedPath,
    });

    // Cache it
    this.cacheTemplate(key, compiled, templateString.length);

    return compiled;
  }

  /**
   * Internal method to compile a template string
   */
  private async compileTemplateString(
    templateString: string,
    options: TemplateRenderOptions = {}
  ): Promise<CompiledTemplate> {
    const ejsOptions: ejs.Options = {
      async: options.async !== false,
      cache: false, // We manage our own cache
      filename: options.filename,
      delimiter: options.delimiter || '%',
      openDelimiter: options.openDelimiter || '<',
      closeDelimiter: options.closeDelimiter || '>',
    };

    // Handle includes resolution
    if (options.resolveIncludes && options.filename) {
      const baseDir = options.includeBasePath || path.dirname(options.filename);
      ejsOptions.root = baseDir;
    }

    const templateFn = ejs.compile(templateString, ejsOptions) as ejs.TemplateFunction;

    // Extract dependencies (included templates)
    const dependencies = this.extractDependencies(templateString);

    const compiled: CompiledTemplate = async (data: any): Promise<string> => {
      if (options.async !== false) {
        return await templateFn(data);
      }
      return templateFn(data) as string;
    };

    // Add metadata to the compiled function
    compiled.source = templateString;
    compiled.path = options.filename || '';
    compiled.dependencies = dependencies;
    compiled.templateFn = templateFn;

    if (options.filename && existsSync(options.filename)) {
      const stats = statSync(options.filename);
      compiled.mtime = stats.mtimeMs;
    }

    return compiled;
  }

  /**
   * Extract included template paths from template string
   */
  private extractDependencies(templateString: string): string[] {
    const dependencies: string[] = [];
    const includeRegex = /<%[-_]?\s*include\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*[^)]+)?\s*\)\s*[-_]?%>/g;

    let match;
    while ((match = includeRegex.exec(templateString)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  /**
   * Prepare data for rendering by injecting helpers
   */
  private prepareRenderData(data: any, options: TemplateRenderOptions = {}): any {
    return {
      ...data,
      helpers: {
        ...this.helpers,
        ...options.helpers,
      },
      // Also expose helpers at top level for convenience
      ...this.helpers,
      ...options.helpers,
    };
  }

  // ============================================
  // Template Cache Management
  // ============================================

  /**
   * Get a cached template if it exists and is valid
   */
  private getCachedTemplate(key: string): TemplateCacheEntry | null {
    const entry = this.templateCache.get(key);
    if (!entry) return null;

    // Check if file has been modified (invalidation)
    if (entry.path && existsSync(entry.path)) {
      const stats = statSync(entry.path);
      if (stats.mtimeMs > entry.mtime) {
        // File has been modified, invalidate cache
        this.templateCache.delete(key);
        return null;
      }
    }

    // Update hit count
    entry.hits++;
    return entry;
  }

  /**
   * Cache a compiled template
   */
  private cacheTemplate(key: string, compiled: CompiledTemplate, size: number): void {
    const entry: TemplateCacheEntry = {
      compiled,
      mtime: compiled.mtime || Date.now(),
      path: compiled.path,
      hits: 0,
      size,
      cachedAt: new Date(),
    };
    this.templateCache.set(key, entry);
  }

  /**
   * Clear the template cache
   * @param cacheKey - Optional specific cache key to clear
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.templateCache.delete(cacheKey);
      logger.debug(`Cleared template cache for key: ${cacheKey}`);
    } else {
      this.templateCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
      logger.debug('Cleared all template cache');
    }
  }

  /**
   * Get template cache statistics
   */
  getCacheStats(): TemplateCacheStats {
    const entries: TemplateCacheStats['entries'] = [];
    let totalMemory = 0;

    this.templateCache.forEach((entry, key) => {
      entries.push({
        key,
        hits: entry.hits,
        size: entry.size,
        mtime: new Date(entry.mtime),
        cachedAt: entry.cachedAt,
      });
      totalMemory += entry.size;
    });

    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      size: this.templateCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: totalMemory,
      entries,
    };
  }

  // ============================================
  // Helper Function Management
  // ============================================

  /**
   * Register a helper function
   */
  registerHelper(name: string, fn: TemplateHelperFunction): void {
    if (typeof fn !== 'function') {
      throw new ApiError(`Helper must be a function, got ${typeof fn}`);
    }
    this.helpers[name] = fn;
    logger.debug(`Registered template helper: ${name}`);
  }

  /**
   * Register multiple helper functions
   */
  registerHelpers(helpers: Record<string, TemplateHelperFunction>): void {
    for (const [name, fn] of Object.entries(helpers)) {
      this.registerHelper(name, fn);
    }
  }

  /**
   * Get all registered helpers
   */
  getHelpers(): Record<string, TemplateHelperFunction> {
    return { ...this.helpers };
  }

  /**
   * Unregister a helper function
   */
  unregisterHelper(name: string): void {
    delete this.helpers[name];
    logger.debug(`Unregistered template helper: ${name}`);
  }

  // ============================================
  // Template Directory Management
  // ============================================

  /**
   * Add a template search directory
   */
  addTemplateDirectory(directory: string, priority: number = 0): void {
    // Check if directory exists
    if (!existsSync(directory)) {
      logger.warn(`Template directory does not exist: ${directory}`);
    }

    // Remove if already exists
    this.templateDirectories = this.templateDirectories.filter(d => d.path !== directory);

    // Add with priority
    this.templateDirectories.push({ path: directory, priority });

    // Sort by priority (highest first)
    this.templateDirectories.sort((a, b) => b.priority - a.priority);

    logger.debug(`Added template directory: ${directory} (priority: ${priority})`);
  }

  /**
   * Remove a template search directory
   */
  removeTemplateDirectory(directory: string): void {
    this.templateDirectories = this.templateDirectories.filter(d => d.path !== directory);
    logger.debug(`Removed template directory: ${directory}`);
  }

  /**
   * Get all registered template directories
   */
  getTemplateDirectories(): TemplateDirectory[] {
    return [...this.templateDirectories];
  }

  /**
   * Resolve a template path from registered directories
   */
  resolveTemplatePath(templateName: string): string | null {
    // If absolute path and exists, return it
    if (path.isAbsolute(templateName) && existsSync(templateName)) {
      return templateName;
    }

    // Search in registered directories
    for (const dir of this.templateDirectories) {
      const fullPath = path.join(dir.path, templateName);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Try as relative path from cwd
    const cwdPath = path.resolve(process.cwd(), templateName);
    if (existsSync(cwdPath)) {
      return cwdPath;
    }

    return null;
  }

  // ============================================
  // Template Validation
  // ============================================

  /**
   * Validate template syntax without rendering
   */
  async validateTemplate(
    templatePathOrString: string,
    isFilePath: boolean = true
  ): Promise<TemplateValidationResult> {
    let templateString: string;

    if (isFilePath) {
      const resolvedPath = this.resolveTemplatePath(templatePathOrString);
      if (!resolvedPath || !existsSync(resolvedPath)) {
        return {
          valid: false,
          errors: [{
            line: 0,
            column: 0,
            message: `Template file not found: ${templatePathOrString}`,
            code: 'FILE_NOT_FOUND',
          }],
          warnings: [],
          variables: [],
          includes: [],
        };
      }
      templateString = readFileSync(resolvedPath, 'utf8');
    } else {
      templateString = templatePathOrString;
    }

    const sanitized = sanitizeTemplateString(templateString);
    const errors: TemplateValidationResult['errors'] = [];
    const warnings: TemplateValidationResult['warnings'] = [];
    const variables: string[] = [];
    const includes = this.extractDependencies(sanitized);

    try {
      // Try to compile - this will throw on syntax errors
      ejs.compile(sanitized, { async: true });

      // Extract variable usage (basic heuristic)
      const varRegex = /<%[=\-_]?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      let match;
      const seen = new Set<string>();
      while ((match = varRegex.exec(sanitized)) !== null) {
        const varName = match[1];
        // Filter out EJS keywords
        if (!['if', 'else', 'for', 'while', 'include', 'helpers'].includes(varName)) {
          if (!seen.has(varName)) {
            seen.add(varName);
            variables.push(varName);
          }
        }
      }

      return {
        valid: true,
        errors: [],
        warnings,
        variables,
        includes,
      };
    } catch (error: any) {
      // Parse EJS error message for line/column info
      const lineMatch = error.message.match(/line\s+(\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;

      errors.push({
        line,
        column: 0,
        message: error.message,
        code: 'SYNTAX_ERROR',
      });

      return {
        valid: false,
        errors,
        warnings,
        variables,
        includes,
      };
    }
  }

  // ============================================
  // Legacy/Email Template Methods (Backward Compatible)
  // ============================================

  async dehydrateEmail(template: Reactory.Models.IEmailTemplate): Promise<Reactory.Models.ITemplate> {

    const { view, client, organization, businessUnit, userId, id } = template
    logger.debug(`TemplateService.dehydrateEmail id: ${id} view:  ${view}, client ${client}, organization: ${organization}, business unit: ${businessUnit}, user id: ${userId}`);
    try {

      let existingTemplate: Reactory.Models.ITemplateDocument = null;

      if (ObjectId.isValid(id)) {
        existingTemplate = await Template.findById(id)
          .populate('client')
          .populate('organization')
          .populate('elements').then() as Reactory.Models.ITemplateDocument;
        logger.debug('TemplateService fetched template using id', { found: existingTemplate !== null });
      }
      else {
        existingTemplate = await this.getTemplate(view, client, organization, businessUnit, userId).then() as Reactory.Models.ITemplateDocument;
        logger.debug('TemplateService search result', { found: existingTemplate !== null });
      }

      const newTemplateAction = async () => {
        logger.debug(`core.ITemplateService creating new template ${template.view}`);

        const _template = new Template() as Reactory.Models.ITemplateDocument
        const _subjectTemplate = new Template() as Reactory.Models.ITemplateDocument;
        const _bodyTemplate = new Template() as Reactory.Models.ITemplateDocument;

        _subjectTemplate._id = new ObjectId();

        _subjectTemplate.client = client;
        _subjectTemplate.organization = organization;
        _subjectTemplate.businessUnit = businessUnit;
        _subjectTemplate.userId = userId;

        _subjectTemplate.kind = TemplateType.content;
        _subjectTemplate.view = `${template.view}/subject`
        _subjectTemplate.content = template.subject;
        _subjectTemplate.format = "text"
        _subjectTemplate.enabled = true
        _subjectTemplate.parameters = [];
        _subjectTemplate.elements = [];

        await _subjectTemplate.save().then();

        _bodyTemplate._id = new ObjectId();

        _bodyTemplate.client = client;
        _bodyTemplate.organization = organization;
        _bodyTemplate.businessUnit = businessUnit;
        _bodyTemplate.user = userId;

        _bodyTemplate.kind = TemplateType.content
        _bodyTemplate.view = `${template.view}/body`
        _bodyTemplate.format = "html"
        _bodyTemplate.content = template.body;
        _bodyTemplate.enabled = true
        _bodyTemplate.parameters = [];
        _bodyTemplate.elements = [];

        _bodyTemplate.createdBy = this.context.user._id;
        _bodyTemplate.created = new Date();

        await _bodyTemplate.save().then();

        _template._id = new ObjectId();

        _template.client = client;
        _template.organization = organization;
        _template.businessUnit = businessUnit;
        _template.user = userId;

        _template.view = template.view;
        _template.kind = TemplateType.email;
        _template.name = template.name;
        _template.visiblity = template.visiblity;
        _template.enabled = true
        _template.description = template.description;

        _template.createdBy = this.context.user._id;
        _template.created = new Date();

        _template.elements = [
          _subjectTemplate,
          _bodyTemplate
        ];

        await _template.save().then()

        return _template;
      }

      const updateExisting = async () => {
        logger.debug(`core.ITemplateService updating template ${template.view}`);

        let subjectSet: boolean = false;
        let bodySet: boolean = false;
        const that = this;

        if (lodash.isArray(existingTemplate.elements) === false) existingTemplate.elements = [];

        const patchContent = async (templateEl: Reactory.Models.ITemplateDocument): Promise<Boolean> => {
          logger.debug(`Patching content for template element`, { templateEl, template });
          try {
            if (templateEl.view.endsWith('/subject')) {
              templateEl.content = template.subject;
              subjectSet = true;
            }

            if (templateEl.view.endsWith('/body')) {
              templateEl.content = template.body;
              bodySet = true;
            }

            templateEl.updated = new Date();
            templateEl.updatedBy = that.context.user._id

            await templateEl.save().then();

            return true;
          } catch (saveError) {
            logger.error(`Could not save the content`, saveError)
            return false;
          }
        }

        await Promise.all(existingTemplate.elements.map(patchContent)).then();

        if (bodySet === false) {
          const _bodyTemplate = new Template() as Reactory.Models.ITemplateDocument;;
          _bodyTemplate._id = new ObjectId();

          _bodyTemplate.client = client;
          _bodyTemplate.organization = organization
          _bodyTemplate.businessUnit = businessUnit
          _bodyTemplate.user = userId

          _bodyTemplate.kind = TemplateType.content
          _bodyTemplate.view = `${template.view}/body`
          _bodyTemplate.format = "html"
          _bodyTemplate.enabled = true
          _bodyTemplate.visiblity = template.visiblity;
          _bodyTemplate.parameters = [];
          _bodyTemplate.elements = [];
          _bodyTemplate.content = template.body;

          _bodyTemplate.save();

          existingTemplate.elements.push(_bodyTemplate)
        }

        if (subjectSet === false) {

          const _subjectTemplate = new Template() as Reactory.Models.ITemplateDocument;
          _subjectTemplate._id = new ObjectId();

          _subjectTemplate.client = client;
          _subjectTemplate.organization = organization;
          _subjectTemplate.businessUnit = businessUnit;
          _subjectTemplate.user = userId

          _subjectTemplate.kind = TemplateType.content;
          _subjectTemplate.organization = organization
          _subjectTemplate.view = `${template.view}/subject`
          _subjectTemplate.format = "text"
          _subjectTemplate.content = template.subject;
          _subjectTemplate.enabled = true
          _subjectTemplate.parameters = [];
          _subjectTemplate.elements = [];
          _subjectTemplate.visiblity = template.visiblity;

          await _subjectTemplate.save().then();

          existingTemplate.elements.push(_subjectTemplate)
        }

        existingTemplate.name = template.name;
        existingTemplate.visiblity = template.visiblity;
        existingTemplate.description = template.description;
        existingTemplate.kind = TemplateType.email;


        return existingTemplate;
      }

      if (existingTemplate === null || existingTemplate === undefined) {
        const $new_template = await newTemplateAction();
        return $new_template;
      }

      if (userId !== null && userId.equals(existingTemplate.user as ObjectId) === true) return await updateExisting();
      if (userId !== null && userId.equals(existingTemplate.user as ObjectId) === false) return newTemplateAction();


      if (businessUnit !== null && businessUnit.equals(existingTemplate.businessUnit as ObjectId) === true) return await updateExisting();
      if (businessUnit !== null && businessUnit.equals(existingTemplate.businessUnit as ObjectId) === false) return newTemplateAction();

      if (organization !== null && existingTemplate.organization && organization.equals(existingTemplate.organization._id) === true) return await updateExisting();
      if (organization !== null && existingTemplate.organization && organization.equals(existingTemplate.organization._id) === false) return newTemplateAction();


      if (client !== null && client.equals(existingTemplate.client._id) === true) return await updateExisting();
      if (client !== null && client.equals(existingTemplate.client._id) === false) return newTemplateAction();

      logger.debug(`Descision tree should have returned, executing default newTemplateAction`)
      return newTemplateAction();

    } catch (dehydrateError) {
      logger.error(`TemplateService.dehydrateEmail() => error ${dehydrateError.message}`);
      throw dehydrateError
    }
  }

  hydrateEmail(template: Reactory.Models.ITemplate | Reactory.Models.ITemplateDocument): Promise<Reactory.Models.IEmailTemplate> {
    if (template === null) Promise.reject(`template may not be null`);

    return Promise.resolve(extractEmailSections(template as Reactory.Models.ITemplateDocument));
  }

  /**
   * Legacy renderTemplate method - maintains backward compatibility
   * For new code, prefer renderFile() or renderString()
   */
  renderTemplate(template: any | String | Reactory.Models.ITemplate, properties: any): string {

    if (typeof template === 'string') {
      const templateString = sanitizeTemplateString(`${template}`);
      const renderData = this.prepareRenderData(properties);
      const compiled: string = ejs.render(templateString, renderData, {
        async: false,
      });

      return compiled;

    } else {
      if (template && template.content) {
        if (template.content.toString().indexOf('$ref://') >= 0) {
          const filename = `${APP_DATA_ROOT}/templates/email/${replaceAll(template.content, '$ref://', '')}`;
          logger.info(`Loading template filename: ${filename}`);
          let templateString = readFileSync(filename).toString('utf8');
          if (existsSync(filename)) {
            try {
              templateString = sanitizeTemplateString(templateString);
              const renderData = this.prepareRenderData(properties);
              return ejs.render(templateString, renderData);
            } catch (renderErr) {
              logger.error('::TEMPLATE RENDER ERROR::', { templateString, renderErr });
              throw renderErr;
            }
          }
          throw new RecordNotFoundError('Filename for template not found', 'TEMPLATE_REF');
        } else {
          const templateString = sanitizeTemplateString(template.content);
          const renderData = this.prepareRenderData(properties);
          return ejs.render(templateString, renderData);
        }
      }

      throw new ApiError(`Invalid type for template.content, expected string, but got ${typeof template.content}`);
    }
  }


  async getTemplate(view: string, reactoryClientId: string | ObjectId, organizationId: string | ObjectId, businessUnitId?: string | ObjectId, userId?: string | ObjectId): Promise<Reactory.Models.ITemplate> {

    logger.debug(`TemplateService.ts.getTemplate()`, { view, reactoryClientId, organizationId, businessUnitId, userId });

    if (view === null || view === undefined) throw new ApiError('parameter: "view" may not be null or undefined', { source: 'core.services.ITemplateService.ts' });
    if (view && view.length < 5) throw new ApiError('parameter: "view" should at least be 5 characters long', { source: 'core.services.ITemplateService.ts' });

    let conditions: { [key: string]: any } = {
      view: view
    };

    let search_type = 'default';

    if (ObjectId.isValid(reactoryClientId) === true) conditions.client = new ObjectId(reactoryClientId)
    else conditions.client = this.context.partner._id;

    if (ObjectId.isValid(organizationId) === true) conditions.organization = new ObjectId(organizationId);
    else conditions.organization = null;

    if (ObjectId.isValid(businessUnitId) === true) conditions.businessUnit = new ObjectId(businessUnitId);
    else conditions.businessUnit = null;

    if (ObjectId.isValid(userId) === true) conditions.user = new ObjectId(userId);
    else conditions.user = null;

    let template: Reactory.Models.ITemplateDocument = await Template.findOne({ filter: conditions })
      .populate('client')
      .populate('organization')
      .populate('elements')
      .then() as Reactory.Models.ITemplateDocument;
    let templates: Reactory.Models.ITemplateDocument[] = [];

    if (template === null && conditions.user) {
      logger.debug(`🟠 [core.ITemplateService] Could not locate the template link to the user, trying without organisation`)
      delete conditions.user;
      search_type = 'organisation / public';
      conditions.visibility = { $in: ['organization', 'public', null] };
      templates = await Template.find(conditions)
        .populate('client')
        .populate('organization')
        .populate('elements').then();
      if (templates.length > 0) {
        template = templates[0];
      }
    }

    if (template === null && conditions.organization) {
      logger.debug(`🟠 [core.ITemplateService] Could not locate the template link to the organiisation, trying without organisation`)
      delete conditions.organization;
      conditions.visibility = { $in: ['client', 'public', null] };
      search_type = 'application / public';
      templates = await Template.find(conditions).populate('client')
        .populate('organization')
        .populate('elements').then();
      if (templates.length > 0) {
        template = templates[0];
      }

    }

    if (template === null && conditions.client) {
      logger.debug(`🟠 [core.ITemplateService] Could not locate the template trying with view name only`)
      delete conditions.client;
      conditions.visibility = { $in: ['public', null] };
      search_type = 'public';
      templates = await Template.find(conditions).populate('client')
        .populate('organization')
        .populate('elements').then();
      if (templates.length > 0) {
        template = templates[0];
      }
    }

    if (template === null) logger.warn('🟠 No template found matching the search criteria', { reactoryClientId, organizationId, businessUnitId, userId });
    else logger.debug(`🟢 Template available using ${search_type} search`);

    return template;

  }

  async setTemplate(view: string, template: Reactory.Models.ITemplateDocument, reactoryClientId?: string | ObjectId, organizationId?: string | ObjectId, businessUnitId?: string | ObjectId, userId?: string | ObjectId): Promise<Reactory.Models.ITemplate> {

    let filter: { [key: string]: any } = {
      view
    };

    let $clientId: ObjectId;
    let $organizationId: ObjectId;
    let $businessUnitId: ObjectId;
    let $userId: ObjectId;

    $clientId = ObjectId.isValid(reactoryClientId) === true ? new ObjectId(reactoryClientId) : this.context.partner._id;
    $organizationId = ObjectId.isValid(organizationId) === true ? new ObjectId(organizationId) : null;
    $businessUnitId = ObjectId.isValid(businessUnitId) === true ? new ObjectId(businessUnitId) : null;
    $userId = ObjectId.isValid(userId) === true ? new ObjectId(userId) : null;

    filter.client = $clientId;
    filter.organization = $organizationId;
    filter.businessUnit = $businessUnitId;
    filter.user = $userId;

    let $template_props: any = {}

    $template_props.client = $clientId;
    $template_props.organization = $organizationId;
    $template_props.businessUnit = $businessUnitId;
    $template_props.user = $userId;

    let $template: Reactory.Models.ITemplateDocument = await Template.findOne({ filter }).then();

    if ($template === null) {
      $template = new Template({ ...template, $template_props }) as Reactory.Models.ITemplateDocument;
    } else {
      $template.content = template.content;
      $template.enabled = template.enabled || $template.enabled;
      $template.locale = template.locale || $template.locale;
      $template.kind = template.kind || $template.kind;
      $template.format = template.format || $template.format;
      $template.view = template.view || $template.view;
      $template.businessUnit = $template_props.businessUnit;
      $template.organization = $template_props.organization;
      $template.user = $template_props.userId;
      $template.client = $template_props.client;
    }

    await $template.save().then()

    return $template;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;

    return true;
  }

  onStartup(): Promise<any> {
    logger.debug(`[core.ReactoryTemplateService].onStartup() 🟢`)

    // Log cache stats on startup
    const stats = this.getCacheStats();
    logger.debug(`TemplateService started with ${stats.size} cached templates, ${Object.keys(this.helpers).length} helpers registered`);

    return Promise.resolve(true);
  }
}


export const TemplateServiceDefinition: Reactory.Service.IReactoryServiceDefinition<ReactoryTemplateService> = {
  id: 'core.TemplateService@1.0.0',
  nameSpace: 'core',
  name: 'TemplateService',
  version: '1.0.0',
  description: 'Enhanced Reactory Template Service for rendering EJS templates with caching, helpers, and code generation support.',
  dependencies: [],
  serviceType: "template",
  secondaryTypes: [
    "file",
    "workflow",
    "development",
    "codeGeneration",
  ],
  service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
    return new ReactoryTemplateService(props, context);
  },
}

export default TemplateServiceDefinition
