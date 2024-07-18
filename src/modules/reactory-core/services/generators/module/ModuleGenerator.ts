import Reactory from "@reactory/reactory-core";
import { roles } from "@reactory/server-core/authentication/decorators";
import modules from "@reactory/server-modules/index";
import { service } from "@reactory/server-core/application/decorators";
import fs from "fs";

type ModuleProperties = {};
type ModuleContext = Reactory.Server.IReactoryContext & {};

@service({
  nameSpace: "core",
  name: "ReactoryModuleGenerator",
  version: "1.0.0",
  description: "Generates a Reactory module structure",
  domain: "module",
  serviceType: "codeGeneration",
  lifeCycle: "singleton",
  dependencies: [
    {
      alias: "templateService",
      id: "core.TemplateService",
    },
  ],
  secondaryTypes: [
    "development",
    "continuousIntegration",
  ],
  features: [
    {
      feature: "generateModule",
      featureType: "function",
      description: "Generates a Reactory module structure",
      action: ["generate", "module-generate"],
      stem: "generate",
    },
  ],
})
class ModuleGenerator extends Reactory.Service.ReactoryService<ModuleProperties, ModuleContext> {
  templateService: Reactory.Service.IReactoryTemplateService;

  constructor(props: ModuleProperties, context: ModuleContext) {
    super();
    this.props = props;
    this.context = context;
  }
  
  /**
   * Generates a Reactory module structure, using the provided module properties.
   * @param module
   */
  @roles(["DEVELOPER"])
  async generateModule(
    module: Partial<Reactory.Server.IReactoryModule>
  ): Promise<Reactory.Server.IReactoryModule> {
    // Implementation here
    const { name, nameSpace, version = "1.0.0", description } = module;
    const {} = this.context;
    const {} = this.props;

    const rootPath = './src/modules/core/services/generators/module/templates';

    //check if module exists
    const modulePath = `src/modules/${nameSpace}/${name}/${version}`;
    if (fs.existsSync(modulePath)) {
      throw new Error(`Module ${name} already exists`);
    }

    // create module 
    const newModule: Reactory.Server.IReactoryModule = {
      name,
      nameSpace,
      version,
      description,
      cli: [],
      services: [],
      clientPlugins: [],
      dependencies: [],
      forms: [],
      graphDefinitions: {
        Resolvers: {
          Mutation: {},
          Query: {},
          Subscription: {},
        },
        Types: [],
        Directives: [],
      },
      grpc: [],
      models: [],
      passportProviders: [],
      pdfs: [],
      translations: [],
      workflows: [],
      priority: 99,
    };

    // create module folder
    fs.mkdirSync(modulePath, { recursive: true });
    [
      "cli",
      "clientPlugins",
      "forms",
      "graphql",
      "models",
      "services",
      "translations",
      "workflows",
      "grpc",
      "pdfs",
      "passportProviders",
    ].forEach((folder) => {
      let props = { module: newModule, folder };
      //@ts-ignore
      props[folder] = newModule[folder]
      fs.mkdirSync(`${modulePath}/${folder}`, { recursive: true });
      fs.writeFileSync(`${modulePath}/${folder}/index.ts`,
        this.templateService.renderTemplate(
          fs
            .readFileSync(`./src/modules/core/services/generators/module/templates/${folder}.index.ts.ejs`, { encoding: "UTF-8" })
            .toString(),
          props
        )
      );
    });
    // create the index.ts file
    fs.writeFileSync(
      `${modulePath}/index.ts`,
      this.templateService.renderTemplate(
        fs
          .readFileSync("./templates/index.ts.ejs", { encoding: "UTF-8" })
          .toString(),
        { module: newModule }
      )
    );
    this.context.modules.push(newModule);
    // update available.json file
    fs.writeFileSync(
      "src/modules/available.json",
      JSON.stringify(this.context.modules, null, 2)
    );
    return newModule;
  }
}

export default ModuleGenerator;
