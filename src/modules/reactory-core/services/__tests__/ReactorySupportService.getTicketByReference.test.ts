import ReactorySupportService from '../ReactorySupportService';
import { InsufficientPermissions } from '@reactory/server-core/exceptions';

/**
 * REACTORY-302016408/20261019/3365961056 — single ticket lookup by reference.
 *
 * The details page is addressed by the ticket reference, so the lookup has to
 * be exact (references contain `/` and are stored upper-case) and it has to
 * apply the same read rules as `getTicket`:
 *
 *  - support staff may read any ticket in the tenant;
 *  - everybody else may read only a ticket they created or are assigned to;
 *  - an unknown reference is `null` (renders "not found"), not an exception.
 */
const mockFindOne = jest.fn();

jest.mock('../../models/ReactorySupportTicket', () => ({
  __esModule: true,
  default: {
    findOne: (...args: any[]) => mockFindOne(...args),
  },
}));

jest.mock('../../models/Comment', () => ({ __esModule: true, default: {} }));
jest.mock('@reactory/server-modules/reactory-core/models/CoreFile', () => ({
  __esModule: true,
  default: {},
  CoreFile: {},
}));

const REFERENCE = 'REACTORY-302016408/20261019/3365961056';
const OWNER_ID = '5f0000000000000000000001';
const OTHER_ID = '5f0000000000000000000002';

const contextFor = (roles: string[], userId: string = OTHER_ID): any => ({
  user: { _id: userId },
  partner: { key: 'REACTORY' },
  hasRole: (role: string) => roles.includes(role),
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
});

/** A mongoose-shaped document: ObjectId-like createdBy/assignedTo. */
const ticketWith = (overrides: Record<string, any> = {}): any => ({
  _id: 'ticket-1',
  reference: REFERENCE,
  createdBy: { toString: () => OWNER_ID },
  assignedTo: undefined,
  ...overrides,
});

const mockFindOneResult = (value: any) => {
  mockFindOne.mockReturnValue({ exec: async () => value });
};

describe('ReactorySupportService.getTicketByReference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks the ticket up by its exact reference', async () => {
    mockFindOneResult(ticketWith());
    const service = new ReactorySupportService({} as any, contextFor(['SUPPORT'], OWNER_ID));

    await service.getTicketByReference(REFERENCE);

    expect(mockFindOne).toHaveBeenCalledWith({ reference: REFERENCE });
  });

  it('tolerates the whitespace and slashes a URL can add', async () => {
    // The route hands over the raw splat: a copied link may carry a trailing
    // slash (`/support/tickets/REF/`). Neither is part of the stored reference,
    // so both are stripped before the exact match.
    mockFindOneResult(ticketWith());
    const service = new ReactorySupportService({} as any, contextFor(['SUPPORT'], OWNER_ID));

    await service.getTicketByReference(`  ${REFERENCE}  `);
    expect(mockFindOne).toHaveBeenCalledWith({ reference: REFERENCE });

    mockFindOne.mockClear();
    await service.getTicketByReference(`/${REFERENCE}/`);
    expect(mockFindOne).toHaveBeenCalledWith({ reference: REFERENCE });
  });

  it('returns null for an unknown reference', async () => {
    mockFindOneResult(null);
    const service = new ReactorySupportService({} as any, contextFor(['USER']));

    await expect(service.getTicketByReference(REFERENCE)).resolves.toBeNull();
  });

  it('does not query the database for a blank reference', async () => {
    const service = new ReactorySupportService({} as any, contextFor(['USER']));

    await expect(service.getTicketByReference('   ')).resolves.toBeNull();
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])(
    'lets %s read a ticket reported by somebody else',
    async (role) => {
      const ticket = ticketWith({ createdBy: { toString: () => OWNER_ID } });
      mockFindOneResult(ticket);
      const service = new ReactorySupportService({} as any, contextFor([role], OTHER_ID));

      await expect(service.getTicketByReference(REFERENCE)).resolves.toBe(ticket);
    },
  );

  it('lets the reporter read their own ticket', async () => {
    const ticket = ticketWith();
    mockFindOneResult(ticket);
    const service = new ReactorySupportService({} as any, contextFor(['USER'], OWNER_ID));

    await expect(service.getTicketByReference(REFERENCE)).resolves.toBe(ticket);
  });

  it('lets the assignee read a ticket assigned to them', async () => {
    const ticket = ticketWith({
      createdBy: { toString: () => OWNER_ID },
      assignedTo: { toString: () => OTHER_ID },
    });
    mockFindOneResult(ticket);
    const service = new ReactorySupportService({} as any, contextFor(['USER'], OTHER_ID));

    await expect(service.getTicketByReference(REFERENCE)).resolves.toBe(ticket);
  });

  it("refuses a ticket that belongs to somebody else", async () => {
    // The ticket exists, so a plain "not found" would be a lie; the caller is
    // told they may not read it, exactly as getTicket does.
    mockFindOneResult(ticketWith({ createdBy: { toString: () => OWNER_ID } }));
    const service = new ReactorySupportService({} as any, contextFor(['USER'], OTHER_ID));

    await expect(service.getTicketByReference(REFERENCE)).rejects.toBeInstanceOf(InsufficientPermissions);
  });

  it('handles populated createdBy/assignedTo documents', async () => {
    // The grids populate these fields; the details query may too. Authorisation
    // must not depend on whether the value is an ObjectId or a document.
    mockFindOneResult(ticketWith({
      createdBy: { _id: OWNER_ID, firstName: 'Owner' },
      assignedTo: { _id: OTHER_ID, firstName: 'Assignee' },
    }));
    const service = new ReactorySupportService({} as any, contextFor(['USER'], OTHER_ID));

    await expect(service.getTicketByReference(REFERENCE)).resolves.toBeTruthy();
  });
});
