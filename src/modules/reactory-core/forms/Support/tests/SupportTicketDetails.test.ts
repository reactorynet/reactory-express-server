import routes from '../../../../../data/clientConfigs/reactory/routes';
import CoreForms from '../../index';
import SupportTicketDetails from '../SupportTicketDetails';
import SupportTickets from '../SupportTickets';
import SupportResolver from '../../../resolvers/Support/SupportResolver';
import {
  SUPPORT_TICKET_DETAILS_FORM_ID,
  SUPPORT_TICKET_DETAILS_LINK_FORMAT,
  SUPPORT_TICKET_DETAILS_ROUTE_KEY,
  SUPPORT_TICKET_DETAILS_ROUTE_PATH,
  SUPPORT_TICKET_REFERENCE_PROP,
} from '../shared/ticketReference';

/**
 * REACTORY-302016408/20261019/3365961056.
 *
 * A ticket could only be read by expanding a row in one of the grids: there was
 * no addressable page and therefore no link. The details page is addressed by
 * the ticket reference — `PARTNER-HASH/YYYYMMDD/HASH`, which contains forward
 * slashes. These tests pin the two halves of that contract:
 *
 *  1. the client route must capture a reference that spans several path
 *     segments (a `:param` route cannot), and
 *  2. the form mounted by that route must resolve the captured reference into a
 *     single-ticket query and render the existing detail panel.
 *
 * All of it would fail on the pre-change tree: the route, the form, the query
 * and the URL contract did not exist, and the grid's reference column was a
 * plain label.
 */
describe('support ticket details — addressable by reference', () => {
  const REFERENCE = 'REACTORY-302016408/20261019/3365961056';

  const detailsRoute = (): any =>
    routes.find((route: any) => route.key === SUPPORT_TICKET_DETAILS_ROUTE_KEY);

  describe('route', () => {
    it('is configured for the reactory client', () => {
      expect(detailsRoute()).toBeDefined();
    });

    it('captures the reference with a splat because references contain slashes', () => {
      const route = detailsRoute();

      // A `:param` segment stops at the first `/`: every real reference would
      // 404. The route must therefore end in a splat.
      expect(route.path).toBe(SUPPORT_TICKET_DETAILS_ROUTE_PATH);
      expect(route.path.endsWith('/*')).toBe(true);
      expect(route.path).not.toContain(':');
    });

    it('passes the captured splat to the form as ticketReference', () => {
      const route = detailsRoute();

      expect(route.componentFqn).toBe(SUPPORT_TICKET_DETAILS_FORM_ID);
      // `route['*']` is how React Router v6 exposes a splat match. Bracket
      // notation matters: `route.*` is not a valid member expression.
      expect(route.componentProps?.[SUPPORT_TICKET_REFERENCE_PROP]).toBe("${route['*']}");
    });

    it('is reachable by the ticket owner and by support staff', () => {
      const route = detailsRoute();

      expect(route.public).toBe(false);
      expect(route.roles).toEqual(expect.arrayContaining(['USER', 'ADMIN', 'SUPPORT_ADMIN', 'SUPPORT']));
    });
  });

  describe('URL scheme', () => {
    const staticPrefix = (): string => SUPPORT_TICKET_DETAILS_ROUTE_PATH.replace(/\*$/, '');

    it('keeps the reference verbatim — its slashes are structural', () => {
      // The grid substitutes the stored reference directly; nothing is
      // percent-encoded, so React Router sees the three real path segments.
      const path = SUPPORT_TICKET_DETAILS_LINK_FORMAT.replace('${rowData.reference}', REFERENCE);

      expect(path).toBe(`/support/tickets/${REFERENCE}`);
      expect(path.slice(staticPrefix().length).split('/')).toEqual(REFERENCE.split('/'));
    });

    it('uses a path a single `:param` could never capture', () => {
      // Documents *why* the route is a splat: the identity spans three path
      // segments, and `:reference` would stop after the first one.
      expect(REFERENCE.split('/').length).toBeGreaterThan(1);
      expect(SUPPORT_TICKET_DETAILS_ROUTE_PATH).not.toContain(':');
    });
  });

  describe('form', () => {
    it('is registered as a core form and a routable component', () => {
      expect(SupportTicketDetails.id).toBe('core.SupportTicketDetails@1.0.0');
      expect(SupportTicketDetails.registerAsComponent).toBe(true);

      const ids = (CoreForms as any[]).map((form) => form.id);
      expect(ids).toContain('core.SupportTicketDetails@1.0.0');
    });

    it('keeps the shared form id in step with the form version', () => {
      // The route configuration cannot import the form module (it would pull
      // the whole server module graph in at config-load time), so it addresses
      // the form by this constant. A version bump that misses it would leave
      // the route pointing at a component that no longer exists.
      expect(SUPPORT_TICKET_DETAILS_FORM_ID).toBe(SupportTicketDetails.id);
    });

    it('resolves the route prop into a single-ticket query', () => {
      const query: any = (SupportTicketDetails.graphql as any).query;

      expect(query.name).toBe('ReactorySupportTicketByReference');
      expect(query.text).toContain('ReactorySupportTicketByReference(reference: $reference)');
      expect(query.variables).toEqual({ 'props.ticketReference': 'reference' });
    });

    it('maps the returned ticket onto the rendered ticket field', () => {
      const query: any = (SupportTicketDetails.graphql as any).query;

      expect(query.resultMap.reference).toBe('ticket.reference');
      expect(query.resultMap.id).toBe('ticket.id');
      expect(query.resultMap.comments).toBe('ticket.comments');
      expect(query.resultMap.documents).toBe('ticket.documents');
    });

    it('renders the same detail panel the grids expand', () => {
      const uiSchema: any = SupportTicketDetails.uiSchema;

      expect(uiSchema.ticket['ui:widget']).toBe('core.SupportTicketDetailPanel@1.0.0');
      expect(uiSchema.ticket['ui:props-map']).toEqual({ formData: 'ticket' });
      expect(uiSchema['ui:grid-layout'].flatMap((row: any) => Object.keys(row))).toContain('ticket');
    });

    it('ships every widget the detail panel needs when opened directly', () => {
      // Direct navigation loads only this form's modules; the panel's tabs are
      // separate components and must be in the manifest or they resolve as
      // "component not registered".
      const moduleIds = ((SupportTicketDetails.modules as any[]) || []).map((entry) => entry.id);

      expect(moduleIds).toEqual(expect.arrayContaining([
        'core.SupportTicketDetailPanel@1.0.0',
        'core.SupportTicketOverview@1.0.0',
        'core.SupportTicketComments@1.0.0',
        'core.SupportTicketAttachments@1.0.0',
        'core.SupportTicketActivity@1.0.0',
        'core.SupportTicketRelated@1.0.0',
      ]));
    });
  });

  describe('resolver', () => {
    const queryMap = (): Record<string, any> =>
      (SupportResolver as any).prototype?.resolver?.Query
      ?? (SupportResolver as any).resolver?.Query;

    it('registers ReactorySupportTicketByReference', () => {
      // The GraphQL SDL declares the field; without this decorator the schema
      // advertises a query no resolver backs, and the details page fails with
      // "Cannot query field" at runtime.
      expect(typeof queryMap().ReactorySupportTicketByReference).toBe('function');
    });

    it('delegates the reference to the service', async () => {
      const ticket = { id: 'ticket-1', reference: REFERENCE };
      const getTicketByReference = jest.fn().mockResolvedValue(ticket);
      const context: any = {
        user: { _id: 'user-1' },
        hasRole: () => true,
        getService: () => ({ getTicketByReference }),
      };

      await expect(
        queryMap().ReactorySupportTicketByReference({}, { reference: REFERENCE }, context),
      ).resolves.toBe(ticket);
      expect(getTicketByReference).toHaveBeenCalledWith(REFERENCE);
    });
  });

  describe('grids link to the details page', () => {
    const referenceColumn = (): any => {
      const columns: any[] = (SupportTickets.uiSchema as any).tickets['ui:options'].columns;
      const column = columns.find((entry) => entry.field === 'reference');
      if (!column) throw new Error('the ticket grid no longer has a reference column');
      return column;
    };

    it('renders the reference as a link rather than a plain label', () => {
      const column = referenceColumn();

      expect(column.component).toBe('LinkFieldWidget');
      expect(column.props.uiSchema['ui:options'].format).toBe(SUPPORT_TICKET_DETAILS_LINK_FORMAT);
    });

    it('links to the route that actually serves the ticket', () => {
      const format: string = referenceColumn().props.uiSchema['ui:options'].format;
      const staticPrefix = SUPPORT_TICKET_DETAILS_ROUTE_PATH.replace(/\*$/, '');

      // The link's static prefix and the route's static prefix are the same, so
      // a grid row cannot point at a path the router does not serve.
      expect(format.startsWith(staticPrefix)).toBe(true);
      expect(format).toContain('${rowData.reference}');
    });
  });
});
