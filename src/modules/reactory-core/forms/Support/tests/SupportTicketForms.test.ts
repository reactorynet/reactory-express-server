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

/**
 * REACTORY-302016408/20261014/2327145804.
 *
 * `message` is a data-only property: the `openTickets`/`users` queries carry a
 * `message` field for failures, but it is not something the user fills in. The
 * legacy engine never displayed it because `ui:grid-layout` is the render list
 * and it does not name `message`. It must stay in the schema (result mapping and
 * payload shape) while being kept out of the form by every engine path.
 */
describe('support ticket form — message is not a rendered field', () => {
  const layoutNames = (form: any, uiSchemaKey?: string): string[] => {
    const ui = uiSchemaKey
      ? form.uiSchemas.find((entry: any) => entry.key === uiSchemaKey).uiSchema
      : form.uiSchema;
    return (ui['ui:grid-layout'] as Array<Record<string, unknown>>).flatMap((row) => Object.keys(row));
  };

  // `SupportTickets.schema` is the async resolver, so resolve it the way the
  // form loader does before inspecting the properties.
  const resolveSchema = async (): Promise<any> =>
    await (SupportTickets.schema as any)(
      SupportTickets,
      {},
      { i18n: { t: (key: string) => key }, user: {} },
      {},
    );

  it('keeps message in the schema so query results still map', async () => {
    const schema = await resolveSchema();
    expect(schema.properties.message).toEqual({ type: 'string' });
  });

  it('does not declare message in the grid layout', () => {
    expect(layoutNames(SupportTickets)).not.toContain('message');
  });

  it('marks message hidden on the grid and list view schemas', () => {
    expect((SupportTickets.uiSchema as any).message).toEqual({ 'ui:hidden': true });
    expect(
      (SupportTickets.uiSchemas.find((entry: any) => entry.key === 'list').uiSchema as any).message,
    ).toEqual({ 'ui:hidden': true });
  });
});
