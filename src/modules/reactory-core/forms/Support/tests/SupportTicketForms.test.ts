import SupportTickets from '../SupportTickets';
import SupportTicketsAdmin, { SUPPORT_STAFF_ROLES } from '../SupportTicketsAdmin';
import CoreForms from '../../index';

/**
 * Support Requests lists the caller's own tickets; the staff view lists every
 * ticket in the tenant. Before `@roles` was enforced, the user screen queried
 * the staff list, so any signed-in user could read every ticket.
 */
describe('support ticket forms', () => {
  const listText = (form: any): string => form.graphql.queries.openTickets.text;

  it('shows a user only their own tickets', () => {
    expect(listText(SupportTickets)).toMatch(/ReactorySupportTickets: ReactoryMySupportTickets\(/);
    expect(SupportTickets.roles).toEqual(['USER']);
  });

  it('shows support staff every ticket, under the same result key', () => {
    expect(listText(SupportTicketsAdmin)).toMatch(/\bReactorySupportTickets\(filter/);
    expect(listText(SupportTicketsAdmin)).not.toMatch(/ReactoryMySupportTickets/);
    expect((SupportTicketsAdmin.graphql as any).queries.openTickets.name).toBe('ReactorySupportTickets');
    expect(SupportTicketsAdmin.roles).toEqual(SUPPORT_STAFF_ROLES);
  });

  it('reuses the user screen and does not change it', () => {
    expect(SupportTicketsAdmin.id).toBe('core.SupportTicketsAdmin@1.0.0');
    expect(SupportTicketsAdmin.uiSchema).toBe(SupportTickets.uiSchema);
    expect(SupportTicketsAdmin.modules).toBe(SupportTickets.modules);
    expect(listText(SupportTickets)).toMatch(/ReactoryMySupportTickets/);
  });

  it('is registered with the core forms', () => {
    const ids = (CoreForms as any[]).map((form) => form.id);
    expect(ids).toEqual(expect.arrayContaining(['core.SupportTickets@1.0.0', 'core.SupportTicketsAdmin@1.0.0']));
  });
});
