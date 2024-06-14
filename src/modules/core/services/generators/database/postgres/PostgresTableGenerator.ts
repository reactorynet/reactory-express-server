import Reactory from "@reactory/reactory-core";
import { PostgresOptions } from "./types";

  class PostgresTableToFormGenerator extends
    Reactory.Service.ReactoryDefaultService<any, Reactory.Server.IReactoryContext> implements 
    Reactory.Forms.ReactoryFormGenerator<PostgresOptions> {
    
    constructor(props: any, context: Reactory.Server.IReactoryContext) {
      super(props, context);
      this.id = 'generators.PostgresTableToFormGenerator@1.0.0';
    }

    id: string;
    async generate(options: PostgresOptions): Promise<Reactory.Forms.IReactoryForm[]> {
        const forms : Reactory.Forms.IReactoryForm[] = [];
        if(!options) {
          throw new Error('No options provided');
        }
        return forms;
    }
    

    onShutdown(): Promise<void> {
        // do nothing
        return Promise.resolve();
    }

    onStartup(): Promise<void> {
        // do nothing
        return Promise.resolve();
    }
  }