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
  Organization.countDocuments = jest.fn();
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

describe('OrganizationService organization writes (ORG-002)', () => {
  let context: any;
  let fileService: any;
  let organizationId: ObjectId;
  let organization: any;
  let service: OrganizationService;

  const fileModel = (alias: string) => ({
    id: new ObjectId(),
    hash: `hash:${alias}`,
    alias,
    filename: alias,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    organizationId = new ObjectId();
    fileService = {
      uploadFile: jest.fn().mockResolvedValue(fileModel(`logo_${organizationId}_default.png`)),
    };

    context = makeContext('operator', new ObjectId());
    context.getService = jest.fn(() => fileService);

    organization = {
      _id: organizationId,
      name: 'Acme',
      code: 'ACME',
      tradingName: 'Acme Trading',
      logo: null,
      avatar: null,
      settings: [],
      setSetting: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    models.Organization.findById.mockResolvedValue(organization);
    models.Organization.countDocuments.mockResolvedValue(1);

    service = new OrganizationService({}, context);
  });

  describe('uploadOrganizationImage', () => {
    it('stores the returned alias on the document and persists it', async () => {
      const alias = `logo_${organizationId}_default.png`;
      fileService.uploadFile.mockResolvedValue(fileModel(alias));

      const result = await service.uploadOrganizationImage(`${organizationId}`, {} as any, 'logo');

      expect(fileService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          catalog: false,
          rename: false,
          filename: `logo_${organizationId}_default`,
          isUserSpecific: false,
          virtualPath: `/organization/${organizationId}/`,
        })
      );
      expect(organization.logo).toBe(alias);
      expect(organization.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(organization);
    });

    it('stores the alias on the avatar for avatar uploads', async () => {
      const alias = `avatar_${organizationId}_default.png`;
      fileService.uploadFile.mockResolvedValue(fileModel(alias));

      await service.uploadOrganizationImage(`${organizationId}`, {} as any, 'avatar');

      expect(organization.avatar).toBe(alias);
      expect(organization.logo).toBeNull();
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('does not resolve before the save has completed', async () => {
      let releaseSave: () => void = () => undefined;
      organization.save = jest.fn(
        () => new Promise<void>((resolve) => { releaseSave = resolve; })
      );

      let settled = false;
      const pending = service
        .uploadOrganizationImage(`${organizationId}`, {} as any, 'avatar')
        .then((value) => {
          settled = true;
          return value;
        });

      // Allow the upload promise chain to reach the save call.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(settled).toBe(false);

      releaseSave();
      await pending;

      expect(settled).toBe(true);
      expect(organization.avatar).toBe(`logo_${organizationId}_default.png`);
    });
  });

  describe('updateOrganizationLogo', () => {
    it('uploads a data URI through the file service and persists the alias', async () => {
      const bytes = 'png-binary-bytes';
      const dataUri = `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
      const alias = `logo_${organizationId}_default.png`;
      fileService.uploadFile.mockResolvedValue(fileModel(alias));

      const result = await service.updateOrganizationLogo(organization, dataUri);

      expect(fileService.uploadFile).toHaveBeenCalledTimes(1);
      const args = fileService.uploadFile.mock.calls[0][0];
      expect(args.filename).toBe(`logo_${organizationId}_default`);
      expect(args.virtualPath).toBe(`/organization/${organizationId}/`);
      expect(args.file.mimetype).toBe('image/png');
      expect(args.file.filename).toBe(`logo_${organizationId}_default.png`);

      const chunks: Buffer[] = [];
      const stream = args.file.createReadStream() as any;
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks).toString()).toBe(bytes);

      expect(organization.logo).toBe(alias);
      expect(organization.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(organization);
    });

    it('rejects image data that is not a data URI', async () => {
      await expect(
        service.updateOrganizationLogo(organization, 'not-a-data-uri')
      ).rejects.toThrow('data URI');

      expect(fileService.uploadFile).not.toHaveBeenCalled();
      expect(organization.save).not.toHaveBeenCalled();
    });
  });

  describe('setOrganization', () => {
    it('clears code and tradingName when they are explicitly cleared', async () => {
      await service.setOrganization(`${organizationId}`, {
        code: null,
        tradingName: '   ',
      } as any);

      expect(organization.code).toBeNull();
      expect(organization.tradingName).toBeNull();
      expect(organization.name).toBe('Acme');
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('leaves unspecified fields untouched', async () => {
      await service.setOrganization(`${organizationId}`, { name: 'Acme Holdings' });

      expect(organization.name).toBe('Acme Holdings');
      expect(organization.code).toBe('ACME');
      expect(organization.tradingName).toBe('Acme Trading');
    });

    it('uses countDocuments rather than the deprecated count', async () => {
      models.Organization.countDocuments.mockResolvedValue(0);

      await expect(
        service.setOrganization(`${organizationId}`, { name: 'Acme' })
      ).rejects.toThrow('could not be found');

      expect(models.Organization.countDocuments).toHaveBeenCalled();
      expect(models.Organization.count).not.toHaveBeenCalled();
    });

    it('rejects an empty name', async () => {
      await expect(
        service.setOrganization(`${organizationId}`, { name: '  ' })
      ).rejects.toThrow('Organization name cannot be empty');

      expect(organization.name).toBe('Acme');
      expect(organization.save).not.toHaveBeenCalled();
    });

    it('rejects an explicit null name', async () => {
      await expect(
        service.setOrganization(`${organizationId}`, { name: null } as any)
      ).rejects.toThrow('Organization name cannot be empty');
    });
  });
});