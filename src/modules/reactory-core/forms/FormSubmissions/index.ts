import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';

const name = 'ReactoryFormSubmissions';
const nameSpace = 'core';

/**
 * The submission explorer.
 *
 * Opened per form from the form list - the target form's fqn arrives on the
 * form data and every query is scoped to it. The form itself is available to
 * any signed in user because the read permission is declared per target form
 * (`submission.readRoles`) and enforced by the submission service on every
 * query, not by who can open this screen.
 */
const ReactoryFormSubmissions: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  graphql,
  uiFramework: 'material',
  uiSupport: ['material'],
  registerAsComponent: true,
  title: 'Form Submissions',
  description: 'Explore the submissions captured for a form through the generic submission pipeline',
  backButton: true,
  roles: ['USER'],
  defaultFormValue: {
    fqn: '',
    filter: {},
    submissions: [],
  },
};

export default ReactoryFormSubmissions;
