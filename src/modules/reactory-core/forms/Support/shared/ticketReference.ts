/**
 * Support ticket reference → URL constants.
 *
 * A ticket reference is built as
 *
 *     `${partner.key}-${HashUnsigned(userId)}/${YYYYMMDD}/${HashUnsigned(request)}`
 *
 * (see `ReactorySupportService.createRequest`) and therefore contains **two
 * forward slashes**, e.g.
 *
 *     REACTORY-302016408/20261019/3365961056
 *
 * The reference is the only stable, human-shareable identifier a ticket has, so
 * it is what a "view this ticket" link carries. A single React Router path
 * parameter (`/support/tickets/:reference`) can never match it: `:reference`
 * stops at the first `/`, so the route would 404 for every real ticket. The
 * details route is therefore declared with a trailing splat
 * (`/support/tickets/*`) and the captured value is handed to the form verbatim.
 *
 * Keeping the rules in one module means the route definition, the details form
 * and the grids that link to it cannot drift apart.
 */

/** Route key of the ticket details page in the client route configuration. */
export const SUPPORT_TICKET_DETAILS_ROUTE_KEY = 'support-ticket-details';

/**
 * Path pattern of the ticket details page.
 *
 * The trailing `*` is a React Router v6 splat: it captures the remainder of the
 * path — slashes included — under the `*` param key.
 */
export const SUPPORT_TICKET_DETAILS_ROUTE_PATH = '/support/tickets/*';

/** Name of the splat param React Router exposes for the captured reference. */
export const SUPPORT_TICKET_REFERENCE_PARAM = '*';

/** Prop the route passes to the details form. */
export const SUPPORT_TICKET_REFERENCE_PROP = 'ticketReference';

/** Fully qualified id of the details form that renders the ticket. */
export const SUPPORT_TICKET_DETAILS_FORM_ID = 'core.SupportTicketDetails@1.0.0';

/**
 * `format` template for the grid's reference column (LinkFieldWidget).
 *
 * The reference is interpolated verbatim: its `/` characters are path
 * separators and the splat route expects them that way. Percent-encoding would
 * make the link depend on every proxy in front of the client decoding — or not
 * decoding — the path identically. References are `[A-Z0-9/-]` by construction,
 * so there is nothing else to escape.
 */
export const SUPPORT_TICKET_DETAILS_LINK_FORMAT = '/support/tickets/${rowData.reference}';
