import ApiError from '@reactory/server-core/exceptions';
import {
  SubmissionFilterCondition,
  SubmissionFilterGroup,
  SubmissionFilterNode,
  SubmissionFilterOperator,
  SubmissionFilterValueType,
} from '../../types/FormSubmission';

/**
 * Compiles the submission filter DSL into a parameterised Postgres predicate
 * over the `form_data` JSONB column.
 *
 * Every value the caller supplies - including the path into the document -
 * leaves this module as a bound parameter. Paths become `text[]` parameters
 * consumed by the `#>` / `#>>` operators, so a field name containing quotes,
 * braces or commas is data rather than syntax and there is no interpolation
 * point to inject through.
 *
 * Numeric comparisons guard the cast: a document where the path holds a
 * non-numeric string would abort the whole query with `invalid input syntax for
 * type numeric`, so the compiler emits a regex guarded CASE that yields NULL
 * (and therefore a non-match) instead of an error.
 */

/** The alias the predicate is compiled against. Set by the caller. */
export interface CompileOptions {
  /** Table alias that owns the form_data column, e.g. `submission`. */
  alias: string;
  /** Prefix for the generated parameter names, keeps them unique per query. */
  paramPrefix?: string;
  /** Maximum number of conditions allowed in one filter. */
  maxConditions?: number;
  /** Maximum nesting depth allowed in one filter. */
  maxDepth?: number;
}

export interface CompiledFilter {
  sql: string;
  params: Record<string, unknown>;
}

const DEFAULT_MAX_CONDITIONS = 64;
const DEFAULT_MAX_DEPTH = 8;

const SUPPORTED_OPERATORS: SubmissionFilterOperator[] = [
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
  'contains', 'startsWith', 'endsWith',
  'in', 'nin', 'exists', 'isNull', 'between',
];

/**
 * Splits a dot / bracket path into the segment array that Postgres' `#>`
 * operator expects. `lines[0].sku` becomes `['lines', '0', 'sku']`.
 */
export const parsePath = (path: string): string[] => {
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new ApiError('A filter condition requires a non empty path', {
      where: 'SubmissionFilter.parsePath', path,
    });
  }

  const segments: string[] = [];
  let current = '';

  for (let i = 0; i < path.length; i += 1) {
    const char = path[i];
    if (char === '.') {
      if (current.length > 0) segments.push(current);
      current = '';
    } else if (char === '[') {
      if (current.length > 0) segments.push(current);
      current = '';
    } else if (char === ']') {
      if (current.length > 0) segments.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0) segments.push(current);

  if (segments.length === 0) {
    throw new ApiError(`The filter path "${path}" did not resolve to any segments`, {
      where: 'SubmissionFilter.parsePath', path,
    });
  }

  return segments;
};

const isGroup = (node: SubmissionFilterNode): node is SubmissionFilterGroup => {
  const group = node as SubmissionFilterGroup;
  return Array.isArray(group?.and) || Array.isArray(group?.or) || group?.not !== undefined;
};

/** Escapes the LIKE metacharacters so a user's `%` is a literal percent sign. */
const escapeLike = (value: string): string =>
  value.replace(/([\\%_])/g, '\\$1');

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const asNumber = (value: unknown, condition: SubmissionFilterCondition): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(parsed)) {
    throw new ApiError(
      `The filter on "${condition.path}" expects a numeric value but received "${asText(value)}"`,
      { where: 'SubmissionFilter.compile', condition },
    );
  }
  return parsed;
};

/**
 * Normalises a date comparison value to an ISO-8601 string. Date comparisons
 * are lexicographic over ISO strings, which orders correctly and avoids casting
 * arbitrary document content to timestamptz.
 */
const asIsoDate = (value: unknown, condition: SubmissionFilterCondition): string => {
  const date = value instanceof Date ? value : new Date(asText(value));
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(
      `The filter on "${condition.path}" expects a date value but received "${asText(value)}"`,
      { where: 'SubmissionFilter.compile', condition },
    );
  }
  return date.toISOString();
};

class FilterCompiler {
  private readonly alias: string;
  private readonly prefix: string;
  private readonly maxConditions: number;
  private readonly maxDepth: number;
  private readonly params: Record<string, unknown> = {};
  private paramIndex = 0;
  private conditionCount = 0;

  constructor(options: CompileOptions) {
    this.alias = options.alias;
    this.prefix = options.paramPrefix || 'sf';
    this.maxConditions = options.maxConditions ?? DEFAULT_MAX_CONDITIONS;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  }

  private bind(value: unknown): string {
    const name = `${this.prefix}_${this.paramIndex}`;
    this.paramIndex += 1;
    this.params[name] = value;
    return `:${name}`;
  }

  /** `form_data #> :path` - the JSONB value at the path, or NULL. */
  private jsonAt(path: string[]): string {
    return `"${this.alias}"."form_data" #> ${this.bind(path)}::text[]`;
  }

  /** `form_data #>> :path` - the value at the path rendered as text, or NULL. */
  private textAt(path: string[]): string {
    return `"${this.alias}"."form_data" #>> ${this.bind(path)}::text[]`;
  }

  /**
   * A numeric projection of the value at the path that yields NULL instead of
   * raising when the document holds something that is not a number.
   */
  private numericAt(path: string[]): string {
    const asTextExpr = this.textAt(path);
    const guard = this.textAt(path);
    return `(CASE WHEN ${guard} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${asTextExpr})::numeric ELSE NULL END)`;
  }

  private comparableAt(condition: SubmissionFilterCondition, path: string[]): string {
    if (condition.valueType === 'number') return this.numericAt(path);
    return this.textAt(path);
  }

  private comparableValue(condition: SubmissionFilterCondition, raw: unknown): unknown {
    switch (condition.valueType) {
      case 'number': return asNumber(raw, condition);
      case 'date': return asIsoDate(raw, condition);
      case 'boolean': return raw === true || raw === 'true';
      default: return asText(raw);
    }
  }

  private compileCondition(condition: SubmissionFilterCondition): string {
    this.conditionCount += 1;
    if (this.conditionCount > this.maxConditions) {
      throw new ApiError(
        `The submission filter exceeds the maximum of ${this.maxConditions} conditions`,
        { where: 'SubmissionFilter.compile' },
      );
    }

    const op = condition.op;
    if (SUPPORTED_OPERATORS.indexOf(op) < 0) {
      throw new ApiError(`Unsupported submission filter operator "${op}"`, {
        where: 'SubmissionFilter.compile',
        condition,
        supported: SUPPORTED_OPERATORS,
      });
    }

    const path = parsePath(condition.path);

    switch (op) {
      case 'exists':
        return `(${this.jsonAt(path)}) IS NOT NULL`;

      case 'isNull':
        return `((${this.jsonAt(path)}) IS NULL OR (${this.jsonAt(path)}) = 'null'::jsonb)`;

      case 'eq':
      case 'ne': {
        // Booleans live in the document as real JSONB booleans, so they are
        // compared against the JSONB literal rather than the text projection.
        if (condition.valueType === 'boolean') {
          const literal = condition.value === true || condition.value === 'true' ? 'true' : 'false';
          const predicate = `(${this.jsonAt(path)}) = '${literal}'::jsonb`;
          return op === 'eq' ? predicate : `NOT (${predicate})`;
        }
        const left = this.comparableAt(condition, path);
        const right = this.bind(this.comparableValue(condition, condition.value));
        // A NULL on either side makes `<>` unknown rather than true, so `ne`
        // spells out that an absent value does not equal the target.
        return op === 'eq'
          ? `${left} = ${right}`
          : `(${left} IS DISTINCT FROM ${right})`;
      }

      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte': {
        const sqlOp = { gt: '>', gte: '>=', lt: '<', lte: '<=' }[op];
        const left = this.comparableAt(condition, path);
        const right = this.bind(this.comparableValue(condition, condition.value));
        return `${left} ${sqlOp} ${right}`;
      }

      case 'between': {
        if (!Array.isArray(condition.value) || condition.value.length !== 2) {
          throw new ApiError(
            `The "between" filter on "${condition.path}" requires a [from, to] value pair`,
            { where: 'SubmissionFilter.compile', condition },
          );
        }
        const left = this.comparableAt(condition, path);
        const lower = this.bind(this.comparableValue(condition, condition.value[0]));
        const upper = this.bind(this.comparableValue(condition, condition.value[1]));
        return `(${left} >= ${lower} AND ${left} <= ${upper})`;
      }

      case 'in':
      case 'nin': {
        if (!Array.isArray(condition.value) || condition.value.length === 0) {
          throw new ApiError(
            `The "${op}" filter on "${condition.path}" requires a non empty array value`,
            { where: 'SubmissionFilter.compile', condition },
          );
        }
        const values = condition.value.map((entry) => asText(entry));
        const predicate = `${this.textAt(path)} = ANY(${this.bind(values)}::text[])`;
        // An absent path yields NULL, which makes `NOT (... = ANY(...))`
        // unknown rather than true. `nin` has to say explicitly that a missing
        // value is not in the set, and the whole branch needs its own
        // parentheses because siblings are joined with AND.
        return op === 'in'
          ? predicate
          : `(NOT (${predicate}) OR ${this.textAt(path)} IS NULL)`;
      }

      case 'contains':
      case 'startsWith':
      case 'endsWith': {
        const needle = escapeLike(asText(condition.value));
        const pattern = op === 'contains'
          ? `%${needle}%`
          : op === 'startsWith' ? `${needle}%` : `%${needle}`;
        return `${this.textAt(path)} ILIKE ${this.bind(pattern)} ESCAPE '\\'`;
      }

      default:
        /* istanbul ignore next - guarded by the SUPPORTED_OPERATORS check */
        throw new ApiError(`Unsupported submission filter operator "${op}"`, {
          where: 'SubmissionFilter.compile', condition,
        });
    }
  }

  private compileGroup(group: SubmissionFilterGroup, depth: number): string {
    const keys = (['and', 'or', 'not'] as const).filter((key) => group[key] !== undefined);
    if (keys.length !== 1) {
      throw new ApiError(
        'A submission filter group must declare exactly one of "and", "or" or "not"',
        { where: 'SubmissionFilter.compile', group },
      );
    }

    if (group.not !== undefined) {
      return `NOT (${this.compileNode(group.not, depth + 1)})`;
    }

    const operator = group.and ? 'AND' : 'OR';
    const children = (group.and || group.or) as SubmissionFilterNode[];

    if (!Array.isArray(children) || children.length === 0) {
      throw new ApiError(
        `A submission filter "${operator.toLowerCase()}" group requires at least one child`,
        { where: 'SubmissionFilter.compile', group },
      );
    }

    const compiled = children.map((child) => this.compileNode(child, depth + 1));
    return `(${compiled.join(` ${operator} `)})`;
  }

  private compileNode(node: SubmissionFilterNode, depth: number): string {
    if (depth > this.maxDepth) {
      throw new ApiError(
        `The submission filter exceeds the maximum nesting depth of ${this.maxDepth}`,
        { where: 'SubmissionFilter.compile' },
      );
    }

    if (node === null || typeof node !== 'object') {
      throw new ApiError('A submission filter node must be an object', {
        where: 'SubmissionFilter.compile', node,
      });
    }

    return isGroup(node)
      ? this.compileGroup(node, depth)
      : this.compileCondition(node as SubmissionFilterCondition);
  }

  compile(node: SubmissionFilterNode): CompiledFilter {
    return { sql: this.compileNode(node, 0), params: this.params };
  }
}

/**
 * Compiles a submission filter into a SQL fragment and its bound parameters.
 * Returns null when there is nothing to filter on.
 */
export const compileSubmissionFilter = (
  node: SubmissionFilterNode | null | undefined,
  options: CompileOptions,
): CompiledFilter | null => {
  if (node === null || node === undefined) return null;
  return new FilterCompiler(options).compile(node);
};

export const supportedOperators = (): SubmissionFilterOperator[] => [...SUPPORTED_OPERATORS];

export const supportedValueTypes = (): SubmissionFilterValueType[] =>
  ['string', 'number', 'boolean', 'date'];

export default compileSubmissionFilter;
