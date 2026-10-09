/**
 * Drift guard: the RouteAccessForm, the shipped `routeAccess` setting and the
 * engine's `IReactoryRouteAccessPolicy` must agree.
 *
 * These three describe the same thing (a route-access policy) in three places, and a
 * mismatch fails **silently** in the worst way: a form field named `allowedAddresses`
 * would save fine and then be ignored by the engine, quietly leaving a route open to
 * any address. This test is the only thing standing between that and production —
 * there is no runtime validation that would catch it.
 *
 * Also covers the two accepted setting shapes: the object the form edits
 * (`{ policies: [...] }`) and the bare array config-as-code can use.
 */
import RouteAccessForm from '../../modules/reactory-core/forms/Security/RouteAccess';
import RouteAccessSetting from '../../data/clientConfigs/reactory/settings/routeAccess';
import { DEFAULT_ROUTE_ACCESS_POLICIES } from '../routeAccess';

const formFields = (): string[] =>
  Object.keys((RouteAccessForm.schema as any).properties.policies.items.properties);

/**
 * The engine's policy contract, mirroring `IReactoryRouteAccessPolicy` in
 * ../routeAccess.ts.
 *
 * Declared explicitly rather than derived from the built-in defaults: the defaults
 * happen not to use every field (`methods`, `ipAllowList`), and a derived list would
 * silently *excuse* a form field the engine cannot read — which is exactly the
 * failure this test exists to prevent. There is deliberately no alias map either: a
 * form field must BE the engine field, because the engine cannot translate.
 */
const ENGINE_FIELDS = ['path', 'methods', 'tenantAuth', 'cors', 'ipAllowList', 'description'];

describe('route access form — contract with the engine', () => {
  it('is registered with a fully-qualified id matching the setting binding', () => {
    expect(RouteAccessForm.id).toBe('core.RouteAccessForm@1.0.0');
    expect((RouteAccessSetting as any).componentFqn).toBe('core.RouteAccessForm@1.0.0');
  });

  it('names every form field exactly as the engine does', () => {
    // There is no translation layer: a friendlier key would be saved and then ignored,
    // silently leaving a route open to any address. Field names must match.
    const unmapped = formFields().filter((field) => !ENGINE_FIELDS.includes(field));
    expect(unmapped).toEqual([]);
  });

  it('offers a control for every engine field an operator must be able to set', () => {
    ENGINE_FIELDS.forEach((engineField) => {
      expect(formFields()).toContain(engineField);
    });
  });

  it('keeps the built-in defaults inside the same contract', () => {
    DEFAULT_ROUTE_ACCESS_POLICIES.forEach((policy) => {
      Object.keys(policy).forEach((key) => expect(ENGINE_FIELDS).toContain(key));
    });
  });

  it('marks the path as required and anchored at the root', () => {
    const items = (RouteAccessForm.schema as any).properties.policies.items;
    expect(items.required).toEqual(['path']);
    expect(items.properties.path.pattern).toBe('^/');
  });

  it('defaults the two safety switches to ON', () => {
    // A form default of `false` would exempt a route the moment it is added.
    const items = (RouteAccessForm.schema as any).properties.policies.items;
    expect(items.properties.tenantAuth.default).toBe(true);
    expect(items.properties.cors.default).toBe(true);
  });

  it('warns that an empty allow-list means any address', () => {
    const items = (RouteAccessForm.schema as any).properties.policies.items;
    expect(String(items.properties.ipAllowList.description)).toMatch(/EMPTY MEANS ANY ADDRESS/);
  });

  it('orders the uiSchema exactly like the schema fields', () => {
    const order = (RouteAccessForm.uiSchema as any).policies.items['ui:order'];
    expect([...order].sort()).toEqual([...formFields()].sort());
  });

  it('ships a setting in the shape the form edits', () => {
    const data: any = (RouteAccessSetting as any).data;
    expect(Array.isArray(data.policies)).toBe(true);
    // And the entry itself is engine-readable: the PayU callback, exempt by necessity.
    const payu = data.policies.find((policy: any) => policy.path === '/api/payment/v1/webhooks/');
    expect(payu).toBeDefined();
    expect(payu.tenantAuth).toBe(false);
    expect(payu.cors).toBe(false);
    expect(payu.methods).toEqual(['POST']);
  });

  it('uses only engine field names inside the shipped setting', () => {
    const data: any = (RouteAccessSetting as any).data;
    data.policies.forEach((policy: any) => {
      Object.keys(policy).forEach((key) => {
        expect(ENGINE_FIELDS).toContain(key);
      });
    });
  });
});
