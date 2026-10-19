import ServiceManager from "../ServiceManager";

jest.mock("@reactory/server-core/logging", () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("@reactory/server-core/modules", () => ({
  enabled: [],
}));

type TestContext = any;

const makeContext = (actor: string): TestContext => ({
  id: `context:${actor}`,
  user: {
    _id: actor,
    hasRole: jest.fn(() => true),
    hasAnyRole: jest.fn(() => true),
  },
  partner: { _id: `partner:${actor}` },
  state: {},
  telemetry: {},
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const makeDefinition = (id: string, service: (props: any, context: any) => any) => ({
  id,
  nameSpace: "test",
  name: id.split(".")[1].split("@")[0],
  version: "1.0.0",
  serviceType: "data",
  lifeCycle: "singleton" as const,
  service,
  dependencies: [] as any[],
});

describe("ServiceManager singleton execution context", () => {
  let manager: ServiceManager;
  let systemContext: TestContext;
  let requestContextA: TestContext;
  let requestContextB: TestContext;

  const register = (definitions: any[]) => {
    definitions.forEach((definition) => {
      (manager as any).serviceRegister[definition.id] = definition;
    });
    (manager as any).services = definitions;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    systemContext = makeContext("system-user");
    requestContextA = makeContext("user-a");
    requestContextB = makeContext("user-b");

    (ServiceManager as any).instance = null;
    manager = ServiceManager.getInstance(systemContext);
  });

  it("resolves the caller context on a singleton constructed at startup", async () => {
    const factory = jest.fn((props: any, context: any) => ({
      name: "TenantBoundService",
      nameSpace: "test",
      version: "1.0.0",
      context,
      whoAmI() {
        return this.context.user._id;
      },
    }));
    const definition = makeDefinition("test.TenantBoundService@1.0.0", factory);
    register([definition]);

    // Simulates startup: the singleton is constructed with the system context.
    await manager.startServices({}, systemContext);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[0][1]).toBe(systemContext);

    const service: any = manager.getService(definition.id, {}, requestContextA);

    expect(service.context).toBe(requestContextA);
    expect(service.whoAmI()).toBe("user-a");
    // Still a singleton: the caller context is not a second instance.
    expect(factory).toHaveBeenCalledTimes(1);
    // The shared instance was not mutated (Option B's race is not reintroduced).
    const cached = (manager as any).instances[`svc_instance::${definition.id}`];
    expect(cached.context).toBe(systemContext);
  });

  it("returns a stable facade per caller while sharing singleton state", async () => {
    const factory = jest.fn((props: any, context: any) => ({
      name: "SharedStateService",
      nameSpace: "test",
      version: "1.0.0",
      context,
      count: 0,
      whoAmI() {
        return this.context.user._id;
      },
      increment() {
        this.count = (this.count || 0) + 1;
        return this.count;
      },
    }));
    const definition = makeDefinition("test.SharedStateService@1.0.0", factory);
    register([definition]);
    await manager.startServices({}, systemContext);

    const first: any = manager.getService(definition.id, {}, requestContextA);
    const second: any = manager.getService(definition.id, {}, requestContextA);
    const other: any = manager.getService(definition.id, {}, requestContextB);

    expect(first).toBe(second);
    expect(other).not.toBe(first);
    expect(factory).toHaveBeenCalledTimes(1);

    expect(first.whoAmI()).toBe("user-a");
    expect(other.whoAmI()).toBe("user-b");

    // `this.count` writes are forwarded to the shared singleton.
    expect(first.increment()).toBe(1);
    expect(other.increment()).toBe(2);
  });

  it("keeps each caller's identity across awaits", async () => {
    const factory = jest.fn((props: any, context: any) => ({
      name: "AsyncIdentityService",
      nameSpace: "test",
      version: "1.0.0",
      context,
      async whoAmIAfterAwait() {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return this.context.user._id;
      },
    }));
    const definition = makeDefinition("test.AsyncIdentityService@1.0.0", factory);
    register([definition]);
    await manager.startServices({}, systemContext);

    const calls: Promise<string>[] = [];
    for (let index = 0; index < 10; index += 1) {
      calls.push(
        (manager.getService(definition.id, {}, requestContextA) as any).whoAmIAfterAwait()
      );
      calls.push(
        (manager.getService(definition.id, {}, requestContextB) as any).whoAmIAfterAwait()
      );
    }

    const results = await Promise.all(calls);
    results.forEach((result, index) => {
      expect(result).toBe(index % 2 === 0 ? "user-a" : "user-b");
    });
  });

  it("propagates the caller context to singleton dependencies", async () => {
    const dependency = makeDefinition(
      "test.DependencyService@1.0.0",
      (props: any, context: any) => ({
        name: "DependencyService",
        nameSpace: "test",
        version: "1.0.0",
        context,
        whoAmI() {
          return this.context.user._id;
        },
      })
    );

    const consumer = makeDefinition(
      "test.ConsumerService@1.0.0",
      (props: any, context: any) => ({
        name: "ConsumerService",
        nameSpace: "test",
        version: "1.0.0",
        context,
        dependency: props.$dependencies.DependencyService,
        askDependency() {
          return this.dependency.whoAmI();
        },
      })
    );
    consumer.dependencies = [{ id: dependency.id, alias: "DependencyService" }];

    register([dependency, consumer]);
    await manager.startServices({}, systemContext);

    const service: any = manager.getService(consumer.id, {}, requestContextA);
    expect(service.askDependency()).toBe("user-a");

    // The shared instance holds the dependency singleton itself, never one
    // caller's facade: the process-wide object must not carry a request
    // context around.
    const cachedConsumer = (manager as any).instances[
      `svc_instance::${consumer.id}`
    ];
    expect(cachedConsumer.context).toBe(systemContext);
    expect(cachedConsumer.dependency.context).toBe(systemContext);
  });

  it("forwards callable dependencies without stripping their methods", async () => {
    // axios.create() returns a *function* with .get/.post attached. The facade
    // must forward it as a value; treating it as a service method replaces it
    // with a bare wrapper and leaves `this.client.post` undefined.
    const client: any = Object.assign(function callableClient() {}, {
      get: jest.fn(() => Promise.resolve({ data: "got" })),
      post: jest.fn(() => Promise.resolve({ data: "posted" })),
    });

    const factory = jest.fn((props: any, context: any) => ({
      name: "CallableDependencyService",
      nameSpace: "test",
      version: "1.0.0",
      context,
      client,
      async callPost() {
        const response = await this.client.post("/x");
        return response.data;
      },
    }));
    const definition = makeDefinition("test.CallableDependencyService@1.0.0", factory);
    register([definition]);
    await manager.startServices({}, systemContext);

    const service: any = manager.getService(definition.id, {}, requestContextA);

    expect(typeof service.client).toBe("function");
    expect(typeof service.client.post).toBe("function");
    expect(await service.callPost()).toBe("posted");
    expect(client.post).toHaveBeenCalledWith("/x");
  });
});
