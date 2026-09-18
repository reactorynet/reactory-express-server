import Reactory from '@reactorynet/reactory-core';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import version from './version';

/**
 * `IReactoryForm` in the published core types does not yet carry `options`
 * (the PWA client augments it from
 * `components/reactory/form-engine/types`). Intersecting the engine pin here
 * keeps this definition type-safe on the server while describing exactly the
 * extra property the runtime reads.
 */
type SQLQueryFormDefinition = Reactory.Forms.IReactoryForm & {
  options?: { engine?: 'v5' | 'fork' };
};

const SQLQueryForm: SQLQueryFormDefinition = {
  id: `core.SQLQueryForm@${version}`,
  schema,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  graphql,
  uiResources: [],
  // Render through the v5 engine. The v5 template set under
  // `reactory-pwa-client/src/components/reactory/form-engine/templates` is
  // Reactory's own MUI v6 implementation (ADR-0004), which is what provides
  // the themed inputs, consistent field spacing and right-aligned action bar.
  // Roll back to the legacy fork by removing this block.
  options: {
    engine: 'v5',
  },
  title: 'SQL Query Editor',
  description: 'Execute SQL queries across connected relational databases',
  registerAsComponent: true,
  nameSpace: 'core',
  name: 'SQLQueryForm',
  version,
  roles: ['DEVELOPER', 'ADMIN'],
};

export default SQLQueryForm;
