import { seedOrganizationDemographics, DEMOGRAPHICS_SERVICE_ID } from '../seedOrganizationDemographics';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const logging: any = require('@reactory/server-core/logging');

/**
 * ORG-030: the shared seeding seam. Both organization-creation paths delegate
 * here, so its contract - seed through the demographics service, never throw,
 * always log - is asserted directly rather than only through its two callers.
 */
const makeContext = (service: any): any => ({
  getService: jest.fn((id: string) => (id === DEMOGRAPHICS_SERVICE_ID ? service : undefined)),
});

describe('seedOrganizationDemographics (ORG-030)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('seeds the organization and reports success', async () => {
    const seedForOrganization = jest.fn().mockResolvedValue({ created: [], existing: [], deleted: [] });
    const context = makeContext({ seedForOrganization });

    await expect(seedOrganizationDemographics('org-1', context)).resolves.toBe(true);

    expect(context.getService).toHaveBeenCalledWith(DEMOGRAPHICS_SERVICE_ID);
    expect(seedForOrganization).toHaveBeenCalledWith('org-1', { executionContext: context });
    expect(logging.warn).not.toHaveBeenCalled();
  });

  it('returns false and warns when the service is not registered', async () => {
    const context = makeContext(undefined);

    await expect(seedOrganizationDemographics('org-2', context)).resolves.toBe(false);

    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/is not available; organization \[org-2\] was created without the base demographic set/),
    );
  });

  it('returns false and warns when seeding throws, instead of propagating', async () => {
    const context = makeContext({ seedForOrganization: jest.fn().mockRejectedValue(new Error('boom')) });

    await expect(seedOrganizationDemographics('org-3', context)).resolves.toBe(false);

    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/for organization \[org-3\] failed: boom/),
    );
  });

  it('returns false and warns when no organization id is supplied', async () => {
    const context = makeContext({ seedForOrganization: jest.fn() });

    await expect(seedOrganizationDemographics(undefined, context)).resolves.toBe(false);

    expect(context.getService).not.toHaveBeenCalled();
    expect(logging.warn).toHaveBeenCalledWith(expect.stringMatching(/no organization id was supplied/));
  });

  it('does not throw when there is no execution context at all', async () => {
    await expect(seedOrganizationDemographics('org-4', null)).resolves.toBe(false);

    expect(logging.warn).toHaveBeenCalledWith(
      expect.stringMatching(/is not available; organization \[org-4\]/),
    );
  });
});
