# gRPC Service Generation Guide

## Overview

The ServiceGenerator now supports gRPC services with automatic Protocol Buffers compilation using `protoc`. The generator creates a Reactory service wrapper around your protoc-generated client code, ensuring proper dependency injection and integration with the Reactory platform.

## Features

- ✅ **Automatic protoc compilation** - Compiles .proto files to JavaScript/TypeScript
- ✅ **Service wrapper generation** - Creates Reactory-compatible service classes
- ✅ **Streaming support** - Handles unary, server, client, and bidirectional streaming
- ✅ **Dependency injection** - Full integration with Reactory's DI system
- ✅ **Error handling** - Proper gRPC error handling and logging
- ✅ **Connection management** - Automatic connection lifecycle management

## Prerequisites

### Required Tools

1. **protoc** (Protocol Buffers Compiler)
   ```bash
   # macOS
   brew install protobuf
   
   # Ubuntu/Debian
   sudo apt-get install protobuf-compiler
   
   # Or download from: https://grpc.io/docs/protoc-installation/
   ```

2. **Node.js gRPC packages** (already in package.json)
   ```bash
   yarn add @grpc/grpc-js @grpc/proto-loader
   ```

3. **Optional: gRPC Tools** (for TypeScript support)
   ```bash
   yarn add -D grpc-tools grpc_tools_node_protoc_ts
   ```

## Quick Start

### 1. Create Your .proto File

```protobuf
// greeter.proto
syntax = "proto3";

package greeter;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

### 2. Create service.yaml

```yaml
id: myapp.GreeterService@1.0.0
name: GreeterService
nameSpace: myapp
version: 1.0.0
description: gRPC Greeter Service
serviceType: grpc

dependencies:
  - id: core.LoggingService@1.0.0
    alias: loggingService
    required: false

spec:
  grpc:
    protoPath: ./greeter.proto        # Path to .proto file
    serviceName: Greeter               # Service name from proto
    packageName: greeter               # Package name from proto
    endpoints:
      - rpc: SayHello                  # RPC method name
        handler: sayHello              # TypeScript method name
        description: Send a greeting
```

### 3. Generate Service

```bash
# Using reactory CLI
reactory service-gen -c greeter-service.yaml -o ./services --overwrite

# Or using bin/cli.sh
bin/cli.sh ServiceGen -c greeter-service.yaml -o ./services
```

### 4. What Gets Generated

```
services/
├── GreeterService.ts          # Your Reactory service wrapper
└── generated/                 # protoc output
    ├── greeter_pb.js          # Generated message types
    └── greeter_grpc_pb.js     # Generated service client (if grpc-tools installed)
```

## Generated Service Structure

The generated service includes:

```typescript
import Reactory from '@reactory/reactory-core';
import { service } from '@reactory/server-core/application/decorators';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

@service({
  id: 'myapp.GreeterService@1.0.0',
  // ... service configuration
})
class GreeterService implements Reactory.Service.IReactoryService {
  // gRPC client instance
  private client: any;
  
  // Connection configuration
  private readonly grpcConfig: {
    host: string;
    port: number;
    credentials: grpc.ChannelCredentials;
  };

  // Lifecycle methods
  async onStart(): Promise<void> { /* ... */ }
  async onShutdown(): Promise<void> { /* ... */ }

  // Your RPC methods
  async sayHello(request: any): Promise<any> { /* ... */ }
  
  // Health check
  async healthCheck(): Promise<{healthy: boolean; message: string}> { /* ... */ }
}
```

## Streaming Modes

### Unary (Request-Response)

```yaml
endpoints:
  - rpc: SayHello
    handler: sayHello
    # No streaming field = unary
```

```typescript
// Usage
const response = await greeterService.sayHello({ name: 'World' });
```

### Server Streaming

```yaml
endpoints:
  - rpc: SayHelloStream
    handler: sayHelloStream
    streaming: server
```

```typescript
// Returns array of all streamed responses
const responses = await greeterService.sayHelloStream({ name: 'World' });
// responses = [response1, response2, response3, ...]
```

### Client Streaming

```yaml
endpoints:
  - rpc: SayHelloManyTimes
    handler: sayHelloManyTimes
    streaming: client
```

```typescript
// Pass array of requests
const requests = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Charlie' }
];
const response = await greeterService.sayHelloManyTimes(requests);
```

### Bidirectional Streaming

```yaml
endpoints:
  - rpc: Chat
    handler: chat
    streaming: bidirectional
```

```typescript
// Pass array of requests, get array of responses
const requests = [{ message: 'Hello' }, { message: 'World' }];
const responses = await greeterService.chat(requests);
```

## Configuration

### Environment Variables

The generated service uses environment variables for configuration:

```bash
# gRPC server connection
GRPC_GREETERSERVICE_HOST=localhost
GRPC_GREETERSERVICE_PORT=50051
GRPC_GREETERSERVICE_TLS=false

# Pattern: GRPC_{SERVICENAME_UPPERCASE}_{SETTING}
```

### Connection Options

The generator automatically configures:
- Message size limits (100MB default)
- Secure/insecure credentials based on `TLS` env var
- Connection pooling and keepalive

## Complete Example

See `/examples/greeter-service.yaml` for a working example.

### Example .proto

```protobuf
syntax = "proto3";

package examples;

service ExampleService {
  // Unary
  rpc GetUser (UserRequest) returns (User) {}
  
  // Server streaming
  rpc ListUsers (ListRequest) returns (stream User) {}
  
  // Client streaming
  rpc CreateUsers (stream User) returns (Summary) {}
  
  // Bidirectional streaming
  rpc Chat (stream Message) returns (stream Message) {}
}

message UserRequest {
  string id = 1;
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

message ListRequest {
  int32 page = 1;
  int32 limit = 2;
}

message Summary {
  int32 count = 1;
  repeated string ids = 2;
}

message Message {
  string content = 1;
  string sender = 2;
}
```

### Example service.yaml

```yaml
id: examples.ExampleService@1.0.0
name: ExampleService
nameSpace: examples
version: 1.0.0
description: Complete gRPC example with all streaming modes
serviceType: grpc

dependencies:
  - id: core.DatabaseService@1.0.0
    alias: db
  - id: core.CacheService@1.0.0
    alias: cache
    required: false

spec:
  grpc:
    protoPath: ./example.proto
    serviceName: ExampleService
    packageName: examples
    endpoints:
      - rpc: GetUser
        handler: getUser
        description: Get a single user by ID
        
      - rpc: ListUsers
        handler: listUsers
        description: Stream list of users
        streaming: server
        
      - rpc: CreateUsers
        handler: createUsers
        description: Create multiple users
        streaming: client
        
      - rpc: Chat
        handler: chat
        description: Bidirectional chat
        streaming: bidirectional
```

## Troubleshooting

### protoc not found

**Error**: `protoc compiler not available`

**Solution**:
```bash
# Install protoc
brew install protobuf  # macOS
# or
sudo apt-get install protobuf-compiler  # Linux

# Verify installation
protoc --version
```

### Proto file not found

**Error**: `Proto file not found: /path/to/file.proto`

**Solution**:
- Use relative path from service.yaml location
- Or use absolute path
- Verify file exists and has correct permissions

### No files generated

**Warning**: `No files were generated by protoc`

**Common causes**:
1. Proto syntax errors - check your .proto file
2. Wrong proto path
3. protoc not in PATH

**Solution**:
```bash
# Test protoc manually
protoc --proto_path=. --js_out=. your-file.proto

# Check for syntax errors
protoc --decode_raw < your-file.proto
```

### TypeScript definitions not generated

**Warning**: `protoc-gen-ts not found`

**Solution** (optional):
```bash
yarn add -D grpc-tools grpc_tools_node_protoc_plugin protoc-gen-ts
```

This is optional - the service will work with JavaScript generated code and use `@grpc/proto-loader` for runtime type loading.

## Best Practices

1. **Keep .proto files with service definitions**
   ```
   services/
   ├── my-service/
   │   ├── service.yaml
   │   ├── my-service.proto
   │   └── MyService.ts (generated)
   ```

2. **Use descriptive handler names**
   ```yaml
   endpoints:
     - rpc: GetUserProfile
       handler: getUserProfile  # camelCase, descriptive
   ```

3. **Document your endpoints**
   ```yaml
   endpoints:
     - rpc: CreateOrder
       handler: createOrder
       description: Creates a new order with validation
   ```

4. **Version your proto files**
   ```protobuf
   syntax = "proto3";
   package myapp.v1;  // Include version in package
   ```

5. **Use environment variables for configuration**
   - Don't hardcode hosts/ports in generated code
   - Use the `GRPC_{SERVICE}_{SETTING}` pattern

## CLI Options

```bash
# Basic generation
reactory service-gen -c service.yaml -o ./output

# With overwrite
reactory service-gen -c service.yaml -o ./output --overwrite

# Generate tests and README
reactory service-gen -c service.yaml -o ./output --tests --readme

# Dry run (validation only)
reactory service-gen -c service.yaml --dry-run
```

## Integration with Reactory

The generated service is a full Reactory service:

```typescript
// Get the service
const greeterService = context.getService<any>('myapp.GreeterService@1.0.0');

// Use it
const response = await greeterService.sayHello({ name: 'World' });

// Health check
const health = await greeterService.healthCheck();
```

## See Also

- [ServiceGenerator README](../README.md) - Main documentation
- [gRPC Official Docs](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://developers.google.com/protocol-buffers)
- [@grpc/grpc-js Documentation](https://www.npmjs.com/package/@grpc/grpc-js)

## FAQ

**Q: Do I need to install grpc-tools?**  
A: No, it's optional. The service will use `@grpc/proto-loader` to load proto files at runtime if grpc-tools is not available.

**Q: Can I use existing protoc-generated code?**  
A: Yes! Place your generated code in the `generated/` folder next to your service, and the wrapper will import it.

**Q: How do I test the generated service?**  
A: Use `--tests` flag to generate test files, or test manually with a running gRPC server.

**Q: Can I customize the generated service?**  
A: Yes, the generated file is your starting point. Edit it as needed, but avoid regenerating without backing up your changes.

**Q: What about authentication?**  
A: The template supports TLS via environment variables. For custom auth (JWT, etc.), modify the generated service's `grpcConfig`.

**Q: How do I run a gRPC server for testing?**  
A: Use the same .proto file to create a server implementation. See [gRPC Node.js basics](https://grpc.io/docs/languages/node/basics/).
