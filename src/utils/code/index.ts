import { ReactoryCodeFactory } from './ReactoryCodeFactory';

const generate = (params: any) => {
  ReactoryCodeFactory.ModuleImportGenerator();
  ReactoryCodeFactory.ClientConfigImportGenerator();
}

generate({});