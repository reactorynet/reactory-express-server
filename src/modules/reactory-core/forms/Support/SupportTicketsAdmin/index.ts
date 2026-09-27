import Reactory from '@reactorynet/reactory-core';
import version from './version';
import SupportTickets from '../SupportTickets';
import userGraphql from '../SupportTickets/graphql';

const name = "SupportTicketsAdmin";
const nameSpace = "core";

/**
 * Support staff's view of every ticket in the tenant. The same screen as the
 * user's Support Requests (core.SupportTickets), which lists only the caller's
 * own tickets; the list query and the roles are the only differences.
 *
 * The roles match the ReactorySupportTickets resolver, which refuses anyone else.
 */
export const SUPPORT_STAFF_ROLES = ['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'];

const openTickets = userGraphql.queries.openTickets;
const staffListText = openTickets.text
  .replace('query ReactoryMySupportTickets(', 'query ReactorySupportTickets(')
  .replace('ReactorySupportTickets: ReactoryMySupportTickets(', 'ReactorySupportTickets(');

const graphql: Reactory.Forms.IFormGraphDefinition = {
  ...userGraphql,
  queries: {
    ...userGraphql.queries,
    openTickets: { ...openTickets, name: 'ReactorySupportTickets', text: staffListText },
  },
};

const SupportTicketsAdmin: Reactory.Forms.IReactoryForm = {
  ...SupportTickets,
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  title: 'All Support Tickets',
  description: 'Every support ticket in the tenant, for support staff',
  graphql,
  roles: SUPPORT_STAFF_ROLES,
};

export default SupportTicketsAdmin;
