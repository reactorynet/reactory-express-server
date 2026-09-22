import Reactory from '@reactorynet/reactory-core';
import {
  applySubmissionPipeline,
  resolveSubmissionConfig,
  DEFAULT_ANON_RATE_LIMIT,
} from '../FormSubmission/SubmissionConfig';

const makeForm = (overrides: Partial<Reactory.Forms.IReactoryForm> = {}) => ({
  id: 'contact.Form@1.0.0',
  nameSpace: 'contact',
  name: 'Form',
  version: '1.0.0',
  schema: { type: 'object' },
  ...overrides,
} as Reactory.Forms.IReactoryForm);

describe('resolveSubmissionConfig', () => {
  it('returns null for a form that has not opted in', () => {
    expect(resolveSubmissionConfig(makeForm())).toBeNull();
  });

  it('returns null when the submission block is present but not enabled', () => {
    expect(resolveSubmissionConfig(makeForm({ submission: { enabled: false } }))).toBeNull();
  });

  it('never infers opt in from a truthy non true value', () => {
    // A YAML overlay can easily produce the string "true"; treating that as
    // opted in would start writing submissions for a form nobody enabled.
    const form = makeForm({ submission: { enabled: 'true' } as never });
    expect(resolveSubmissionConfig(form)).toBeNull();
  });

  it('defaults read roles to ADMIN', () => {
    const config = resolveSubmissionConfig(makeForm({ submission: { enabled: true } }));
    expect(config.readRoles).toEqual(['ADMIN']);
  });

  it('defaults delete roles to the read roles', () => {
    const config = resolveSubmissionConfig(makeForm({
      submission: { enabled: true, readRoles: ['ADMIN', 'MANAGER'] },
    }));
    expect(config.deleteRoles).toEqual(['ADMIN', 'MANAGER']);
  });

  it("defaults submit roles to the form's own roles", () => {
    const config = resolveSubmissionConfig(makeForm({
      roles: ['CUSTOMER'],
      submission: { enabled: true },
    }));
    expect(config.submitRoles).toEqual(['CUSTOMER']);
  });

  it('defaults submit roles to USER when the form declares none', () => {
    const config = resolveSubmissionConfig(makeForm({ submission: { enabled: true } }));
    expect(config.submitRoles).toEqual(['USER']);
  });

  it('rate limits anonymous forms by default', () => {
    const config = resolveSubmissionConfig(makeForm({
      submission: { enabled: true, allowAnonymous: true },
    }));
    expect(config.rateLimit).toEqual(DEFAULT_ANON_RATE_LIMIT);
  });

  it('leaves authenticated forms unlimited unless a limit is declared', () => {
    const config = resolveSubmissionConfig(makeForm({ submission: { enabled: true } }));
    expect(config.rateLimit).toBeUndefined();
  });

  it('honours a declared rate limit over the anonymous default', () => {
    const config = resolveSubmissionConfig(makeForm({
      submission: { enabled: true, allowAnonymous: true, rateLimit: { max: 3, windowSeconds: 30 } },
    }));
    expect(config.rateLimit).toEqual({ max: 3, windowSeconds: 30 });
  });

  it('defaults allowUpdate to false', () => {
    const config = resolveSubmissionConfig(makeForm({ submission: { enabled: true } }));
    expect(config.allowUpdate).toBe(false);
  });
});

describe('applySubmissionPipeline', () => {
  it('leaves a form that has not opted in untouched', () => {
    const form = makeForm();
    expect(applySubmissionPipeline(form)).toBe(form);
  });

  it('injects the generic mutation for new and edit', () => {
    const result = applySubmissionPipeline(makeForm({ submission: { enabled: true } }));
    expect(result.graphql.mutation.new.name).toBe('ReactoryFormSubmit');
    expect(result.graphql.mutation.edit.name).toBe('ReactoryFormSubmit');
  });

  it("maps the form's own id into the fqn variable", () => {
    const result = applySubmissionPipeline(makeForm({ submission: { enabled: true } }));
    expect(result.graphql.mutation.new.variables).toMatchObject({
      'form.id': 'fqn',
      formData: 'formData',
    });
  });

  it('only maps the submission id in edit mode', () => {
    const result = applySubmissionPipeline(makeForm({ submission: { enabled: true } }));
    expect(result.graphql.mutation.new.variables['formData.__submissionId']).toBeUndefined();
    expect(result.graphql.mutation.edit.variables['formData.__submissionId']).toBe('id');
  });

  it('never overrides a mutation the form declares itself', () => {
    const own = { name: 'MyOwnMutation', text: 'mutation MyOwnMutation { noop }' };
    const result = applySubmissionPipeline(makeForm({
      submission: { enabled: true },
      graphql: { mutation: { new: own } } as never,
    }));
    expect(result.graphql.mutation.new).toBe(own);
    // The gap is still filled.
    expect(result.graphql.mutation.edit.name).toBe('ReactoryFormSubmit');
  });

  it("preserves the form's existing queries", () => {
    const queries = { lookup: { name: 'Lookup', text: 'query Lookup { noop }' } };
    const result = applySubmissionPipeline(makeForm({
      submission: { enabled: true },
      graphql: { queries } as never,
    }));
    expect(result.graphql.queries).toBe(queries);
  });

  it('replaces the raw submission block with the resolved one', () => {
    const result = applySubmissionPipeline(makeForm({ submission: { enabled: true } }));
    expect((result as never as { submission: { readRoles: string[] } }).submission.readRoles)
      .toEqual(['ADMIN']);
  });

  it('adds a redirect handler only when a success url is declared', () => {
    const plain = applySubmissionPipeline(makeForm({ submission: { enabled: true } }));
    expect(plain.graphql.mutation.new.onSuccessMethod).toEqual(['notification']);

    const redirecting = applySubmissionPipeline(makeForm({
      submission: { enabled: true, onSuccessUrl: '/thanks' },
    }));
    expect(redirecting.graphql.mutation.new.onSuccessMethod).toEqual(['notification', 'redirect']);
    expect(redirecting.graphql.mutation.new.onSuccessUrl).toBe('/thanks');
  });

  it('uses the declared success message for the notification', () => {
    const result = applySubmissionPipeline(makeForm({
      submission: { enabled: true, successMessage: 'Thanks for getting in touch' },
    }));
    expect(result.graphql.mutation.new.notification.title).toBe('Thanks for getting in touch');
  });
});
