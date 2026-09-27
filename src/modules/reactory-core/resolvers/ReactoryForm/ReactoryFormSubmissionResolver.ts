import Reactory from '@reactorynet/reactory-core';
import { resolver, query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import ApiError from '@reactory/server-core/exceptions';
import UserModel from '../../models/User';
import type { ReactoryFormSubmissionService } from '../../services/FormSubmission';
import {
  ReactoryFormSubmissionConfig,
  ReactoryFormSubmissionFilter,
  ReactoryFormSubmissionPaging,
  ReactoryFormSubmissionResult,
  ReactoryFormSubmissionSort,
} from '../../types/FormSubmission';

/** The payload the ReactoryFormSubmit mutation resolves to. */
interface SubmitResponse {
  success: boolean;
  message: string;
  submission: ReactoryFormSubmissionResult | null;
}

const SERVICE_ID = 'core.ReactoryFormSubmissionService@1.0.0';

export interface ReactoryFormSubmitArgs {
  fqn: string;
  formData: Record<string, unknown>;
  id?: string;
}

export interface ReactoryFormSubmissionsArgs {
  fqn: string;
  filter?: ReactoryFormSubmissionFilter;
  paging?: ReactoryFormSubmissionPaging;
  sort?: ReactoryFormSubmissionSort;
}

/**
 * Transport for the generic form submission pipeline.
 *
 * All permission and tenancy rules live on the service - this resolver only
 * shapes arguments and results. Note that `ReactoryFormSubmit` deliberately
 * carries no `@roles` decorator: the roles that may submit are declared per
 * form in its `submission` block, and an anonymous caller is legitimate when
 * the form opted into it. The service enforces that before touching the table.
 */
// @ts-ignore
@resolver
class ReactoryFormSubmissionResolver {

  static resolver: Reactory.Graph.IResolverStruct;

  private getService(context: Reactory.Server.IReactoryContext): ReactoryFormSubmissionService {
    return context.getService(SERVICE_ID) as unknown as ReactoryFormSubmissionService;
  }

  /**
   * The explorer's query builder hands the structured predicate over as text so
   * that it can be typed into a field, while a programmatic caller sends the
   * object. Normalise both to an object before the service compiles it, and
   * report a bad expression as a query error rather than a compile failure
   * deep inside the filter compiler.
   */
  private normaliseFilter(filter: ReactoryFormSubmissionFilter): ReactoryFormSubmissionFilter {
    const normalised = { ...filter };

    if (typeof normalised.query === 'string') {
      const text = (normalised.query as unknown as string).trim();
      if (text.length === 0) {
        delete normalised.query;
        return normalised;
      }
      try {
        normalised.query = JSON.parse(text);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'An unknown error occurred';
        throw new ApiError(
          `The data query is not valid JSON: ${errorMessage}`,
          { where: 'ReactoryFormSubmissions resolver', query: text },
        );
      }
    }

    return normalised;
  }

  @query('ReactoryFormSubmissions')
  async listSubmissions(
    obj: unknown,
    args: ReactoryFormSubmissionsArgs,
    context: Reactory.Server.IReactoryContext,
  ) {
    const { fqn, filter = {}, paging = {}, sort } = args;
    if (!fqn) throw new ApiError('fqn is required', { where: 'ReactoryFormSubmissions resolver' });
    return this.getService(context).list(fqn, this.normaliseFilter(filter), paging, sort);
  }

  @query('ReactoryFormSubmissionById')
  async getSubmission(
    obj: unknown,
    args: { id: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).get(args.id);
  }

  @query('ReactoryFormSubmissionStats')
  async getStats(
    obj: unknown,
    args: { fqn: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return this.getService(context).stats(args.fqn);
  }

  /**
   * Resolves the submitting user for a submission. Anonymous submissions and
   * users that have since been removed resolve to null rather than failing the
   * whole listing.
   */
  @property('ReactoryFormSubmission', 'user')
  async getSubmissionUser(
    submission: ReactoryFormSubmissionResult,
    args: unknown,
    context: Reactory.Server.IReactoryContext,
  ) {
    if (!submission?.userId) return null;
    try {
      return await UserModel.findById(submission.userId).then();
    } catch (userErr) {
      context.log(
        `Could not resolve the user ${submission.userId} for submission ${submission.id}`,
        { userErr }, 'warn', 'ReactoryFormSubmissionResolver');
      return null;
    }
  }

  /**
   * Resolves whether the calling user may open the submissions explorer for
   * this form. The client uses it to show or hide the explorer entry point,
   * which keeps the permission rule in one place - the service still enforces
   * it on every read.
   */
  @property('ReactoryFormSubmissionConfig', 'canExplore')
  async getCanExplore(
    config: ReactoryFormSubmissionConfig,
    args: unknown,
    context: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    if (!config || config.enabled !== true) return false;
    const readRoles = config.readRoles && config.readRoles.length > 0 ? config.readRoles : ['ADMIN'];
    return readRoles.some((role) => context.hasRole(role) === true);
  }

  @mutation('ReactoryFormSubmit')
  async submitForm(
    obj: unknown,
    args: ReactoryFormSubmitArgs,
    context: Reactory.Server.IReactoryContext,
  ): Promise<SubmitResponse> {
    const { fqn, formData, id } = args;

    try {
      const submission = await this.getService(context).submit({ fqn, formData, id });
      return {
        success: true,
        message: id ? 'Submission updated' : 'Submission received',
        submission,
      };
    } catch (submitError: unknown) {
      const errorMessage = submitError instanceof Error ? submitError.message : 'An unknown error occurred';
      context.log(
        `Could not capture the submission for ${fqn}: ${errorMessage}`,
        { submitError, fqn }, 'error', 'ReactoryFormSubmissionResolver');
      // The mutation is reachable anonymously, so the failure is reported as a
      // result rather than thrown - the form shows the message and the caller
      // learns nothing about the internals from a stack trace.
      return {
        success: false,
        message: errorMessage || 'The submission could not be captured',
        submission: null,
      };
    }
  }

  @mutation('ReactoryFormSubmissionDelete')
  async deleteSubmission(
    obj: unknown,
    args: { id: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    try {
      const deleted = await this.getService(context).delete(args.id);
      return {
        success: deleted,
        message: deleted ? `Submission ${args.id} deleted` : `Submission ${args.id} was not found`,
      };
    } catch (deleteError: unknown) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : 'An unknown error occurred';
      context.log(
        `Could not delete the submission ${args.id}: ${errorMessage}`,
        { deleteError }, 'error', 'ReactoryFormSubmissionResolver');
      return { success: false, message: errorMessage };
    }
  }
}

export type { ReactoryFormSubmissionConfig };
export default ReactoryFormSubmissionResolver;
