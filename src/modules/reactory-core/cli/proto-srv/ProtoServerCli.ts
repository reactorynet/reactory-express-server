type ReactoryCliApp = (vargs: string[], context: Reactory.Server.IReactoryContext) => Promise<void>;
import { ReadLine } from "readline";
import { colors } from 'modules/reactory-reactor/helpers';

/**
 * The ProtoServerCliApp is a command line interface for starting and 
 * stopping a gRPC server that serves a protobuf service. 
 * 
 * @param kwargs 
 * @param context 
 * @returns 
 */
const ProtoServerCliApp: ReactoryCliApp = async (kwargs: string[], context: Reactory.Server.IReactoryContext): Promise<void> => { 
  const rl: ReadLine = context.readline as ReadLine;

  return;
}

const ProtoServerCliAppDefinition: Reactory.IReactoryComponentDefinition<ReactoryCliApp> = { 
  name: 'ProtoServerCli',
  version: '1.0.0',
  description: 'ProtoServerCli', 
  component: ProtoServerCliApp,
  domain: 'cli',
  overwrite: false,
  features: [],
  stem: 'protobuf',
  tags: ['cli', 'proto', 'server', 'grpc', 'protobuf'],    
}