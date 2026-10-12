import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';

/**
 * core.StaticContentInputForm@1.0.0
 *
 * The properties editor for a route bound to `core.StaticContent@1.0.0`. Its
 * `formData` is the route's `componentProps`, and its schema mirrors the
 * component's public prop surface.
 *
 * Resolved by the Application route editor
 * (`ApplicationRoutesPanel` → `resolvePropsSchema`) via the standard
 * `InputForm` naming convention:
 *
 *   core.StaticContent@1.0.0 → core.StaticContentInputForm@1.0.0
 *
 * The route editor renders the resolved schema + uiSchema through a nested
 * `ReactoryForm` and writes the result back onto `componentProps`.
 */
const name = 'StaticContentInputForm';
const nameSpace = 'core';

const StaticContentInputForm: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  title: 'Static Content Binding',
  description:
    'Properties editor for a route bound to core.StaticContent@1.0.0 — content selection, presentation, editing, comments and advanced options.',
  uiFramework: 'material',
  uiSupport: ['material'],
  registerAsComponent: true,
  schema,
  uiSchema,
  roles: ['ADMIN', 'DEVELOPER', 'USER'],
  tags: ['static-content', 'route', 'properties', 'editor', 'cms'],
};

export default StaticContentInputForm;
