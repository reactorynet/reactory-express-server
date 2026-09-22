import Reactory from '@reactorynet/reactory-core';
import { ReactoryFormSubmissionConfig } from '../../types/FormSubmission';

/**
 * Shared resolution of a form's `submission` block, used by both the form
 * service (which injects the generic mutation into the resolved definition)
 * and the submission service (which enforces the same rules on every write and
 * read). Keeping one implementation means the roles the UI is told about and
 * the roles the database actually checks can never drift apart.
 */

/** The default rate limit applied to forms that accept anonymous submissions. */
export const DEFAULT_ANON_RATE_LIMIT = { max: 20, windowSeconds: 60 };

/**
 * Returns the effective submission configuration for a form with all defaults
 * applied, or null when the form has not opted into the generic pipeline.
 *
 * Opt in is always explicit: a form must declare `submission: { enabled: true }`.
 * Nothing is inferred from the absence of a graphql block.
 */
export const resolveSubmissionConfig = (
  form: Reactory.Forms.IReactoryForm,
): ReactoryFormSubmissionConfig | null => {
  const declared = (form as unknown as { submission?: ReactoryFormSubmissionConfig })?.submission;
  if (!declared || declared.enabled !== true) return null;

  const allowAnonymous = declared.allowAnonymous === true;
  const submitRoles = declared.submitRoles
    || (form.roles && form.roles.length > 0 ? form.roles : ['USER']);
  const readRoles = declared.readRoles || ['ADMIN'];

  return {
    ...declared,
    enabled: true,
    allowAnonymous,
    submitRoles,
    readRoles,
    deleteRoles: declared.deleteRoles || readRoles,
    allowUpdate: declared.allowUpdate === true,
    rateLimit: declared.rateLimit || (allowAnonymous ? DEFAULT_ANON_RATE_LIMIT : undefined),
  };
};

const SUBMIT_MUTATION = `mutation ReactoryFormSubmit($fqn: String!, $formData: Any!, $id: String) {
  ReactoryFormSubmit(fqn: $fqn, formData: $formData, id: $id) {
    success
    message
    submission {
      id
      fqn
      userId
      createdAt
    }
  }
}`;

/**
 * Builds the generic mutation definition that is injected into a form that uses
 * the submission pipeline.
 *
 * `variables` is an object map evaluated by the client data manager against
 * `{ form, formData, formContext, props }`, so `form.id` supplies the fqn
 * without the form definition having to repeat its own name. In edit mode the
 * optional `__submissionId` key on the form data identifies the submission
 * being amended - forms that never amend simply do not set it.
 */
const buildMutation = (
  config: ReactoryFormSubmissionConfig,
  mode: 'new' | 'edit',
): Reactory.Forms.IReactoryFormMutation => {
  const onSuccessMethod: string[] = ['notification'];
  if (config.onSuccessUrl) onSuccessMethod.push('redirect');

  const variables: Record<string, string> = {
    'form.id': 'fqn',
    formData: 'formData',
  };

  if (mode === 'edit') {
    variables['formData.__submissionId'] = 'id';
  }

  return {
    name: 'ReactoryFormSubmit',
    text: SUBMIT_MUTATION,
    variables,
    resultType: 'object',
    onSuccessMethod: onSuccessMethod as Reactory.Forms.ReactoryFormActionHandlerType[],
    onSuccessUrl: config.onSuccessUrl,
    onSuccessRedirectTimeout: config.onSuccessUrl ? 1000 : undefined,
    notification: {
      inAppNotification: true,
      title: config.successMessage || 'Your submission has been received',
      props: {
        timeOut: 3000,
        canDismiss: true,
      },
    },
  } as Reactory.Forms.IReactoryFormMutation;
};

/**
 * Returns the form with the generic submission mutation merged into its graph
 * definition, and its submission config normalised so that the client receives
 * the effective roles rather than the raw declaration.
 *
 * A mutation the form declares itself always wins - the pipeline fills gaps, it
 * never overrides an explicit definition.
 */
export const applySubmissionPipeline = (
  form: Reactory.Forms.IReactoryForm,
): Reactory.Forms.IReactoryForm => {
  const config = resolveSubmissionConfig(form);
  if (!config) return form;

  const existingGraph = (form.graphql || {}) as Reactory.Forms.IFormGraphDefinition;
  const existingMutations = (existingGraph.mutation || {}) as Reactory.Forms.IReactoryFormMutations;

  const mutation: Reactory.Forms.IReactoryFormMutations = { ...existingMutations };
  if (!mutation.new) mutation.new = buildMutation(config, 'new');
  if (!mutation.edit) mutation.edit = buildMutation(config, 'edit');

  return {
    ...form,
    submission: config,
    graphql: {
      ...existingGraph,
      mutation,
    },
  } as Reactory.Forms.IReactoryForm;
};

export default applySubmissionPipeline;
