import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

/**
 * Starts a grpc server using the provided context and args.
 * @param args 
 * @param context 
 */
export const start = (args: string[], context: Reactory.Server.IReactoryContext) => {
  const options: grpc.ServerOptions = {};
  const server = new grpc.Server(options);

  const files: string[] = [];
  let services: { [key: string]: any } = {};
  
  context.modules.forEach((module) => { 
    module.grpc.forEach((reactoryGrpcConfig) => { 
      if(reactoryGrpcConfig.protos !== undefined && reactoryGrpcConfig.protos !== null) {
        if(typeof(reactoryGrpcConfig.protos) === 'string') { 
          files.push(reactoryGrpcConfig.protos);
        } else if(Array.isArray(reactoryGrpcConfig.protos)) { 
          files.push(...reactoryGrpcConfig.protos);
        }
      }
      
      if(reactoryGrpcConfig.services !== undefined && reactoryGrpcConfig.services !== null) { 
        services = { ...services, ...reactoryGrpcConfig.services };
      }
    });  
  });
  const packageDefinition = protoLoader.loadSync(
    files,
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
  const protoDescriptor: grpc.GrpcObject = grpc.loadPackageDefinition(packageDefinition);
  // @ts-ignore
  const systemService = protoDescriptor.reactory.System;
    
  server.addService(systemService.service, { getApiStatus: getApiStatus });
  server.bindAsync(`0.0.0.0:${process.env.GRPC_PORT || '50051'}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`Server running at http://0.0.0.0:${process.env.GRPC_PORT || '50051'}`);  
  });
}
