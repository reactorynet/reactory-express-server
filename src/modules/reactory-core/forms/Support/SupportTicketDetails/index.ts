import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import modules from '../SupportTickets/modules';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';
import { SUPPORT_TICKET_DETAILS_FORM_ID } from '../shared/ticketReference';

const name = 'SupportTicketDetails';
const nameSpace = 'core';

/**
 * A single support ticket, addressed by its reference.
 *
 * This is the page the `/support/tickets/*` route mounts. It is deliberately
 * *not* a new UI: the ticket is rendered by `core.SupportTicketDetailPanel`
 * — the same widget the grids use as their expanded detail panel — so the
 * details page and the grid row show the same thing.
 *
 * The form's query binds `props.ticketReference` (supplied by the route from the
 * splat param) to the `reference` variable of
 * `ReactorySupportTicketByReference`, then maps the returned ticket into the
 * `ticket` field the uiSchema renders.
 */
const SupportTicketDetails: Reactory.Forms.IReactoryForm = {
  id: SUPPORT_TICKET_DETAILS_FORM_ID,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  avatar: safeCDNUrl(`themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase()),
  registerAsComponent: true,
  title: 'Support Ticket',
  description: 'View a single support ticket by its reference',
  backButton: true,
  uiSupport: ['material'],
  // Reuse the support widget manifest: the detail panel pulls in the overview,
  // comments, attachments, activity and related-ticket widgets, and the module
  // compiler only ships what this form declares.
  modules,
  graphql,
  roles: ['USER', 'ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'],
};

export default SupportTicketDetails;
