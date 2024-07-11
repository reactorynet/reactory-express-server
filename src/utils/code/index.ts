import { ReactoryCodeFactory } from './ReactoryCodeFactory';

const generate = () => {
  ReactoryCodeFactory.ModuleImportGenerator();
  ReactoryCodeFactory.ClientConfigImportGenerator();
}

generate();
