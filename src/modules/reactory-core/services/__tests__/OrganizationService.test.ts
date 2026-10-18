import { ObjectId } from "mongodb";
import ServiceManager from "@reactory/server-core/services/ServiceManager";
import { OrganizationService } from "../OrganizationService";

jest.mock("@reactory/server-core/logging", () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("@reactory/server-core/modules", () => ({
  enabled: [],
}));

jest.mock("@reactory/server-modules/reactory-core/models", () => {
  const Team: any = jest.fn();
  Team.count = jest.fn();
  Team.find = jest.fn();
  Team.findById = jest.fn();

  const Organization: any = jest.fn();
  Organization.findById = jest.fn();
  Organization.findOne = jest.fn();
  Organization.count = jest.fn();
  Organization.find = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.findOne = jest.fn();
  BusinessUnit.findById = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();

  return { Team, Organization, BusinessUnit, User };
});

const models = require("@reactory/server-modules/reactory-core/models");

const SERVICE_ID = "core.OrganizationService@1.0.0";

const makeContext = (actor: string, id: ObjectId) => {
  const context: any = {
    id: `context:${actor}`,
    user: {
      _id: id,
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      memberships: [],
    },
    partner: { _id: new ObjectId() },
    state: {},
    telemetry: {},
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getService: jest.fn(),
  };
  context.hasRole = jest.fn(() => true);
  return context;
};

const serviceDefinition = () => ({
  id: SERVICE_ID,
  name: "ReactoryOrganization",
  nameSpace: "core",
  version: "1.0.0",
  serviceType: "organization",
  lifeCycle: "singleton" as const,
  dependencies: [] as any[],
  service: (props: any, context: any) => new OrganizationService(props, context),
});

describe("OrganizationService singleton actor attribution", () => {
  let manager: ServiceManager;
  let systemContext: any;
  let requestContext: any;
  let systemUserId: ObjectId;
  let requestUserId: ObjectId;
  let organizationId: ObjectId;
  let savedTeams: any[];

  beforeEach(() => {
    jest.clearAllMocks();

    systemUserId = new ObjectId();
    requestUserId = new ObjectId();
    organizationId = new ObjectId();

    systemContext = makeContext("system", systemUserId);
    requestContext = makeContext("operator", requestUserId);

    savedTeams = [];
    models.Team.mockImplementation((doc: any) => {
      const team = {
        ...doc,
        save: jest.fn().mockResolvedValue(undefined),
      };
      savedTeams.push(team);
      return team;
    });
    models.Team.count.mockResolvedValue(0);
    models.Organization.findById.mockResolvedValue({
      _id: organizationId,
      teams: [],
      save: jest.fn().mockResolvedValue(undefined),
    });

    (ServiceManager as any).instance = null;
    manager = ServiceManager.getInstance(systemContext);
    const definition = serviceDefinition();
    (manager as any).serviceRegister[SERVICE_ID] = definition;
    (manager as any).services = [definition];
  });

  it("records the request user on a team created through a startup singleton", async () => {
    // Simulates startup: the singleton is constructed with the system context.
    await manager.startServices({}, systemContext);

    const organizationService: any = manager.getService(SERVICE_ID, {}, requestContext);
    await organizationService.createTeam(organizationId, "Engineering");

    expect(savedTeams).toHaveLength(1);
    const team = savedTeams[0];
    expect(team.owner.toString()).toBe(requestUserId.toString());
    expect(team.createdBy.toString()).toBe(requestUserId.toString());
    expect(team.updatedBy.toString()).toBe(requestUserId.toString());
    expect(team.createdBy.toString()).not.toBe(systemUserId.toString());
  });

  it("records the request user when the context is passed explicitly", async () => {
    const organizationService = new OrganizationService({}, systemContext);

    await organizationService.createTeam(
      organizationId,
      "Operations",
      requestContext
    );

    expect(savedTeams).toHaveLength(1);
    expect(savedTeams[0].createdBy.toString()).toBe(requestUserId.toString());
    expect(savedTeams[0].updatedBy.toString()).toBe(requestUserId.toString());
  });

  it("authorises against the request user, not the system user", async () => {
    await manager.startServices({}, systemContext);
    const organizationService: any = manager.getService(SERVICE_ID, {}, requestContext);

    await organizationService.createTeam(organizationId, "Support");

    expect(requestContext.hasRole).toHaveBeenCalled();
    expect(systemContext.hasRole).not.toHaveBeenCalled();
  });
});
