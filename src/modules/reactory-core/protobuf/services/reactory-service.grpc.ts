const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(
  'reactory-service.proto',
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const systemService = protoDescriptor.core.SystemService;

// Implement the getApiStatus RPC method
function getApiStatus(call, callback) {
  // Here you can implement checks or database queries to determine the API status
  const response = {
    id: call.request.id,
    when: new Date().toISOString(),
    status: "API-OK" // or "API-ERROR" based on your internal logic
  };

  callback(null, response);
}

function main() {
  const server = new grpc.Server();
  server.addService(systemService.service, { getApiStatus: getApiStatus });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Server running at http://0.0.0.0:50051');
    server.start();
  });
}

main();
