import { isArray } from 'lodash';
import { roles } from '@reactory/server-core/authentication/decorators'
import Reactory from '@reactorynet/reactory-core';
import modules from '@reactory/server-core/modules';
import ApiError from '@reactory/server-core/exceptions';

class ReactoryFormService implements Reactory.Service.IReactoryFormService {

  name: string = 'ReactoryFormService';
  nameSpace: string = 'core';
  version: string = '1.0.0';
  description?: string = 'Reactory Form service is used to manage forms in the system.';
  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;
  fileService: Reactory.Service.IReactoryFileService;
  searchService: Reactory.Service.ISearchService;
  compiler: Reactory.Service.IReactoryModuleCompilerService;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;    
    this.props = props;
  }

  override(form: Reactory.Forms.IReactoryForm, overrides: Reactory.Forms.IReactoryForm): Promise<Reactory.Forms.IReactoryForm> {
    throw new Error('Method not implemented.');
  }
  
  toString?(includeVersion?: boolean): string {
    if (includeVersion === true) return `${this.name}@${this.version}`;
    return `${this.name}@${this.version}`;
  }

  /**
   * Returns the code / module defined form for a given id (if any).
   * This is the form as it is registered in memory by an enabled module and
   * does not include any YAML overlay that may have been persisted to disk.
   */
  private getCodeForm(id: string): Reactory.Forms.IReactoryForm {
    let _form: Reactory.Forms.IReactoryForm = null;
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.Forms.IReactoryForm) => {
          if (form && form.id === id) {
            let allow_form: boolean = true;
            if (form.roles && form.roles.length > 0) {
              form.roles.forEach((role: string) => {
                if (that.getExecutionContext().hasRole(role) === true) {
                  allow_form = true;
                }
              });
            }

            if (allow_form === true && form) {
              _form = form;
            }
          }
        });
      }
    });
    return _form;
  }

  /**
   * Resolves the directory where YAML form overlays are stored.
   * ($REACTORY_DATA/forms). Returns null when REACTORY_DATA is not configured.
   */
  private getFormsDataDir(): string | null {
    const reactoryData = process.env.REACTORY_DATA;
    if (!reactoryData) {
      this.getExecutionContext().log(
        'REACTORY_DATA env var is not set – YAML form persistence is disabled',
        {}, 'warn', 'ReactoryFormService');
      return null;
    }
    // path is only used to join – require synchronously is fine here.
    const path = require('path');
    return path.join(reactoryData, 'forms');
  }

  /**
   * Builds the absolute path for a form's YAML overlay file using the
   * canonical nameSpace.name@version.yaml naming convention.
   */
  private getFormYamlPath(nameSpace: string, name: string, version: string): string | null {
    const dir = this.getFormsDataDir();
    if (!dir) return null;
    const path = require('path');
    return path.join(dir, `${nameSpace}.${name}@${version}.yaml`);
  }

  /**
   * Loads and parses a YAML overlay for the given form coordinates.
   * Returns null when REACTORY_DATA is not set, the file does not exist or the
   * content cannot be parsed into an object.
   */
  private loadFormYaml(nameSpace: string, name: string, version: string): Reactory.Forms.IReactoryForm | null {
    const filePath = this.getFormYamlPath(nameSpace, name, version);
    if (!filePath) return null;
    const fs = require('fs');
    if (fs.existsSync(filePath) !== true) return null;
    try {
      const yaml = require('js-yaml');
      const parsed = yaml.load(fs.readFileSync(filePath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        return parsed as Reactory.Forms.IReactoryForm;
      }
      this.getExecutionContext().log(
        `YAML overlay for ${nameSpace}.${name}@${version} did not parse to an object`,
        { filePath }, 'warn', 'ReactoryFormService');
      return null;
    } catch (err) {
      this.getExecutionContext().log(
        `Failed to load YAML overlay for ${nameSpace}.${name}@${version}: ${err.message}`,
        { filePath, err }, 'error', 'ReactoryFormService');
      return null;
    }
  }

  /**
   * Scans the forms data directory and returns every parseable YAML form
   * definition found there. These are user authored / published forms that are
   * not embedded in a registered module.
   */
  private scanYamlForms(): Reactory.Forms.IReactoryForm[] {
    const dir = this.getFormsDataDir();
    if (!dir) return [];
    const fs = require('fs');
    if (fs.existsSync(dir) !== true) return [];
    const results: Reactory.Forms.IReactoryForm[] = [];
    try {
      const yaml = require('js-yaml');
      const path = require('path');
      const files: string[] = fs.readdirSync(dir).filter((f: string) => /\.ya?ml$/i.test(f));
      for (const file of files) {
        try {
          const parsed = yaml.load(fs.readFileSync(path.join(dir, file), 'utf8'));
          if (parsed && typeof parsed === 'object') {
            results.push(parsed as Reactory.Forms.IReactoryForm);
          } else {
            this.getExecutionContext().log(
              `YAML form file ${file} did not parse to an object – skipping`,
              { file }, 'warn', 'ReactoryFormService');
          }
        } catch (innerErr) {
          this.getExecutionContext().log(
            `Skipping unparseable YAML form file ${file}: ${innerErr.message}`,
            { file }, 'warn', 'ReactoryFormService');
        }
      }
    } catch (err) {
      this.getExecutionContext().log(
        `Failed to scan forms directory ${dir}: ${err.message}`,
        { dir, err }, 'error', 'ReactoryFormService');
    }
    return results;
  }

  /**
   * Scans the forms data directory for a YAML defined (virtual) form that has
   * the supplied id. Used to resolve forms that have no code counterpart.
   */
  private findYamlFormById(id: string): Reactory.Forms.IReactoryForm | null {
    return this.scanYamlForms().find((form) => (form as any)?.id === id) || null;
  }

  /**
   * Applies the role based access check to a form. A form with no roles is
   * available to everyone, otherwise the current execution context must hold at
   * least one of the required roles.
   */
  private isFormAllowed(form: Reactory.Forms.IReactoryForm): boolean {
    if (!form) return false;
    if (!form.roles || form.roles.length === 0) return true;
    return form.roles.some((role: string) => this.getExecutionContext().hasRole(role) === true);
  }

  /**
   * Deep merges a YAML overlay over a base (code) form. Objects are merged
   * recursively while arrays and primitive values from the overlay replace the
   * base value entirely. This keeps schema / uiSchema / graphql blocks
   * overridable as whole units while still allowing partial base config edits.
   */
  private mergeFormOverlay(base: any, overlay: any): any {
    if (overlay === undefined) return base;
    if (overlay === null) return null;
    if (Array.isArray(overlay)) return overlay;
    if (typeof overlay === 'object') {
      if (base === null || base === undefined || typeof base !== 'object' || Array.isArray(base)) {
        return { ...overlay };
      }
      const out: any = { ...base };
      Object.keys(overlay).forEach((key) => {
        out[key] = this.mergeFormOverlay(base[key], overlay[key]);
      });
      return out;
    }
    return overlay;
  }

  async get(id: string): Promise<Reactory.Forms.IReactoryForm> {
    const codeForm = this.getCodeForm(id);

    if (codeForm) {
      const overlay = this.loadFormYaml(codeForm.nameSpace, codeForm.name, codeForm.version);
      if (overlay) {
        return this.mergeFormOverlay(codeForm, overlay) as Reactory.Forms.IReactoryForm;
      }
      return codeForm;
    }

    // No code form – the id may reference a purely virtual (YAML only) form.
    const virtualForm = this.findYamlFormById(id);
    return virtualForm;
  }

  async search(form: Partial<Reactory.Forms.IReactoryForm>, targetModule?: string, where?: Reactory.Service.FormStore[]): Promise<Reactory.Forms.IReactoryForm[]> {
    let _forms: Reactory.Forms.IReactoryForm[] = [];
    

    return _forms
  }

  //@roles(['ADMIN', 'USER', 'ANON'])
  list(): Promise<Reactory.Forms.IReactoryForm[]> {
    const that = this;

    // Preserve discovery order while allowing YAML overlays / virtual forms to
    // be merged in by id.
    const order: string[] = [];
    const byId = new Map<string, Reactory.Forms.IReactoryForm>();

    // 1. Collect the forms registered by enabled modules (code forms).
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.Forms.IReactoryForm, fidx: number) => {
          if (form) {
            if (that.isFormAllowed(form) === true) {
              if (byId.has(form.id) === false) order.push(form.id);
              byId.set(form.id, form);
            }
          } else {
            that.getExecutionContext().log(`NULL FORM ${module.name} - ${fidx}`, form, 'error', 'ReactoryFormResolver')
          }
        });
      }
    });

    // 2. Merge in the YAML defined forms. When a YAML form overlays a code form
    //    (same id) it is deep merged over it. Forms that have no code
    //    counterpart are surfaced as standalone (user authored) forms.
    that.scanYamlForms().forEach((yamlForm) => {
      if (!yamlForm || !(yamlForm as any).id) {
        that.getExecutionContext().log('Skipping YAML form without an id', { yamlForm }, 'warn', 'ReactoryFormService');
        return;
      }

      const id = (yamlForm as any).id as string;
      const existing = byId.get(id);
      if (existing) {
        byId.set(id, that.mergeFormOverlay(existing, yamlForm) as Reactory.Forms.IReactoryForm);
      } else if (that.isFormAllowed(yamlForm) === true) {
        order.push(id);
        byId.set(id, yamlForm);
      }
    });

    const _forms = order.map((id) => byId.get(id)).filter((form) => !!form);
    return Promise.resolve(_forms);
  }

  globals(): Promise<Reactory.Forms.IReactoryForm[]> {
    const _forms: Reactory.Forms.IReactoryForm[] = [];
    const that = this;
    modules.enabled.forEach((module) => {
      if (isArray(module.forms) === true) {
        module.forms.forEach((form: Reactory.Forms.IReactoryForm, fidx: number) => {
          if (form && form.name.indexOf("$GLOBAL$") >= 0) {
            let allow_form: boolean = true;
            if (form.roles && form.roles.length > 0) {
              form.roles.forEach((role: string) => {
                if (that.getExecutionContext().hasRole(role) === true) {
                  allow_form = true;
                }
              });
            }

            if (allow_form === true && form) {
              _forms.push(form);
            }
          } else {
            that.getExecutionContext().log(`NULL FORM ${module.name} - ${fidx}`, form, 'error', 'ReactoryFormResolver')
          }
        });
      }
    });

    return Promise.resolve(_forms);
  }

  /**
   * Produces a YAML / JSON safe clone of a value, dropping function valued
   * properties and undefined entries. Functions cannot be represented in YAML
   * and, in the context of a form, are runtime server resolvers that must not
   * be overridden by the persisted overlay.
   */
  private sanitizeForYaml(value: any): any {
    if (value === null) return null;
    if (Array.isArray(value)) {
      return value
        .map((item) => this.sanitizeForYaml(item))
        .filter((item) => item !== undefined);
    }
    if (typeof value === 'function') return undefined;
    if (typeof value === 'object') {
      const out: any = {};
      Object.keys(value).forEach((key) => {
        // strip runtime / internal only markers
        if (key.startsWith('__') && key.endsWith('__')) return;
        const sanitized = this.sanitizeForYaml(value[key]);
        if (sanitized !== undefined) out[key] = sanitized;
      });
      return out;
    }
    return value;
  }

  /**
   * Persists a form definition as a YAML overlay to
   * $REACTORY_DATA/forms/nameSpace.name@version.yaml.
   *
   * Because most forms are shipped as TypeScript / function definitions that
   * cannot be mutated at runtime, edits are stored as a YAML overlay that is
   * deep merged over the code form when it is next resolved via get().
   */
  async save(form: Reactory.Forms.IReactoryForm, options?: { publish: boolean, git?: Reactory.Git.GitOptions, module?: string, storage?: Reactory.Service.FormStore }): Promise<Reactory.Forms.IReactoryForm> {
    if (!form) {
      throw new ApiError('form is required', { where: 'ReactoryFormService.save' });
    }

    const nameSpace = form.nameSpace;
    const name = form.name;
    const version = form.version || '1.0.0';

    // Validate the identifier segments so they are safe to use as a file name.
    const pathSegmentPattern = /^[a-zA-Z0-9_.\-]+$/;
    for (const [field, value] of [['nameSpace', nameSpace], ['name', name], ['version', version]] as const) {
      if (!value || pathSegmentPattern.test(value) !== true) {
        throw new ApiError(
          `${field} is missing or contains invalid characters. Only alphanumeric, dash, underscore and dot are allowed.`,
          { where: 'ReactoryFormService.save', field, value });
      }
    }

    if (!form.id) {
      throw new ApiError('form.id is required', { where: 'ReactoryFormService.save' });
    }

    const filePath = this.getFormYamlPath(nameSpace, name, version);
    if (!filePath) {
      throw new ApiError('REACTORY_DATA environment variable is not set, cannot persist form', { where: 'ReactoryFormService.save' });
    }

    const fs = require('fs');
    const path = require('path');
    const yaml = require('js-yaml');

    // Build a serializable overlay. Function valued fields (server side schema
    // / uiSchema / defaultFormValue resolvers) are dropped so that they remain
    // owned by the code form.
    const overlay = this.sanitizeForYaml(form);

    let yamlContent: string;
    try {
      yamlContent = yaml.dump(overlay, { noRefs: true, lineWidth: 120, sortKeys: false });
    } catch (dumpErr) {
      throw new ApiError(`Could not serialize form to YAML: ${dumpErr.message}`, { where: 'ReactoryFormService.save', dumpErr });
    }

    try {
      const dir = path.dirname(filePath);
      if (fs.existsSync(dir) !== true) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, yamlContent, 'utf8');
      this.getExecutionContext().log(
        `Saved YAML overlay for form ${nameSpace}.${name}@${version} to ${filePath}`,
        { filePath }, 'info', 'ReactoryFormService');
    } catch (writeErr) {
      this.getExecutionContext().log(
        `Failed to write YAML overlay for form ${nameSpace}.${name}@${version}: ${writeErr.message}`,
        { filePath, writeErr }, 'error', 'ReactoryFormService');
      throw new ApiError(`Failed to persist form: ${writeErr.message}`, { where: 'ReactoryFormService.save', writeErr });
    }

    // Return the freshly merged form so the caller receives the effective
    // definition (code form + overlay). Fall back to the sanitized overlay for
    // purely virtual forms that have no code counterpart.
    const merged = await this.get(form.id);
    return merged || (overlay as Reactory.Forms.IReactoryForm);
  }

  delete(form: Reactory.Forms.IReactoryForm): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async getCompiledResourceForModule(module: Reactory.Forms.IReactoryFormModule): Promise<Reactory.Forms.IReactoryFormResource> {    
    return this.compiler.compileModule(module);
  }

  async getResources(form: Reactory.Forms.IReactoryForm): Promise<Reactory.Forms.IReactoryFormResource[]> {

    const resources: Reactory.Forms.IReactoryFormResource[] = [];
    const that = this;

    if(!form.uiResources) form.uiResources = [];
    form.uiResources.forEach((resource) => {
      resources.push(resource);
    });

    if (form.modules && form.modules.length > 0) {
      //use an async fuction generator to 
      //compile the item and add it to the 
      //resources list.
      async function* compiledResourcesGenerator() {
        for (let i: number = 0; i < form.modules.length; i++) {
          const module: Reactory.Forms.IReactoryFormModule = form.modules[i];
          const resource = await that.getCompiledResourceForModule(module).then();
          yield resource;
        }
      }

      for await (const resource of compiledResourcesGenerator()) {
        resources.push(resource);
      }
    }

    return resources;

  }

  onStartup(): Promise<any> {
    return Promise.resolve(true);
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService) {
    this.fileService = fileService;
  }

  setCompiler(compiler: Reactory.Service.IReactoryModuleCompilerService) {
    this.compiler = compiler;
  }

  setSearchService(searchService: Reactory.Service.ISearchService) {
    this.searchService = searchService
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactoryFormService> = {
    id: 'core.ReactoryFormService@1.0.0',
    description: 'Reactory Form service is used to manage forms in the system. The ',
    nameSpace: 'core',
    name: 'ReactoryFormService',
    serviceType: "forms",
    version: '1.0.0',
    domain: "ui",
    stem: "form",
    service: (props, context): ReactoryFormService => {
      return new ReactoryFormService(props, context)
    },
    dependencies: [
      {
        id: 'core.ReactoryFileService@1.0.0',
        alias: 'fileService'
      },
      {
        id: 'core.ReactoryModuleCompilerService@1.0.0',
        alias: 'compiler'
      },
      {
        id: 'core.ReactorySearchService@1.0.0',
        alias: 'searchService'
      }
    ],
  }
}

export default ReactoryFormService;