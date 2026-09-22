import {
  compileSubmissionFilter,
  parsePath,
} from '../FormSubmission/SubmissionFilter';
import { SubmissionFilterNode } from '../../types/FormSubmission';

const compile = (node: SubmissionFilterNode) =>
  compileSubmissionFilter(node, { alias: 'submission', paramPrefix: 'sf' });

/**
 * The compiler is the one place in the submission pipeline that builds SQL, so
 * these tests care about two things above all: that no caller supplied value
 * ever reaches the statement text, and that the emitted predicate means what
 * the filter says it means.
 */
describe('SubmissionFilter.parsePath', () => {
  it('splits a dotted path into segments', () => {
    expect(parsePath('address.country')).toEqual(['address', 'country']);
  });

  it('splits array indexes out of a bracket path', () => {
    expect(parsePath('lines[0].sku')).toEqual(['lines', '0', 'sku']);
  });

  it('keeps a single segment path intact', () => {
    expect(parsePath('email')).toEqual(['email']);
  });

  it('rejects an empty path', () => {
    expect(() => parsePath('  ')).toThrow();
  });
});

describe('SubmissionFilter.compileSubmissionFilter', () => {
  it('returns null when there is nothing to filter on', () => {
    expect(compile(null as unknown as SubmissionFilterNode)).toBeNull();
    expect(compile(undefined as unknown as SubmissionFilterNode)).toBeNull();
  });

  it('binds the path as a parameter rather than interpolating it', () => {
    // A field name carrying SQL punctuation must land in params, never in sql.
    const compiled = compile({ path: "evil'); drop table x;--", op: 'eq', value: 'x' });
    expect(compiled.sql).not.toContain('drop table');
    expect(Object.values(compiled.params)).toContainEqual(["evil'); drop table x;--"]);
  });

  it('binds the comparison value as a parameter', () => {
    const compiled = compile({ path: 'country', op: 'eq', value: "ZA'; --" });
    expect(compiled.sql).not.toContain("ZA'");
    expect(Object.values(compiled.params)).toContain("ZA'; --");
  });

  it('compiles an equality predicate against the text projection', () => {
    const compiled = compile({ path: 'country', op: 'eq', value: 'ZA' });
    expect(compiled.sql).toContain('#>>');
    expect(compiled.sql).toContain('=');
  });

  it('treats ne as "is distinct from" so a missing value does not match', () => {
    const compiled = compile({ path: 'country', op: 'ne', value: 'ZA' });
    expect(compiled.sql).toContain('IS DISTINCT FROM');
  });

  it('guards the numeric cast so non numeric documents do not abort the query', () => {
    const compiled = compile({ path: 'score', op: 'gte', value: 80, valueType: 'number' });
    expect(compiled.sql).toContain('CASE WHEN');
    expect(compiled.sql).toContain('::numeric');
    expect(Object.values(compiled.params)).toContain(80);
  });

  it('rejects a non numeric value for a numeric comparison', () => {
    expect(() => compile({ path: 'score', op: 'gte', value: 'high', valueType: 'number' }))
      .toThrow(/numeric value/);
  });

  it('normalises a date comparison to an ISO-8601 string', () => {
    const compiled = compile({
      path: 'signedAt', op: 'gte', value: '2026-01-15', valueType: 'date',
    });
    expect(Object.values(compiled.params)).toContain(new Date('2026-01-15').toISOString());
  });

  it('compares booleans against the JSONB literal', () => {
    const compiled = compile({ path: 'optIn', op: 'eq', value: true, valueType: 'boolean' });
    expect(compiled.sql).toContain("'true'::jsonb");
  });

  it('escapes LIKE metacharacters in a contains match', () => {
    const compiled = compile({ path: 'notes', op: 'contains', value: '100%' });
    expect(compiled.sql).toContain('ILIKE');
    expect(Object.values(compiled.params)).toContain('%100\\%%');
  });

  it('anchors startsWith and endsWith on the correct side', () => {
    expect(Object.values(compile({ path: 'ref', op: 'startsWith', value: 'AB' }).params))
      .toContain('AB%');
    expect(Object.values(compile({ path: 'ref', op: 'endsWith', value: 'AB' }).params))
      .toContain('%AB');
  });

  it('compiles in against a bound text array', () => {
    const compiled = compile({ path: 'status', op: 'in', value: ['new', 'open'] });
    expect(compiled.sql).toContain('= ANY(');
    expect(Object.values(compiled.params)).toContainEqual(['new', 'open']);
  });

  it('makes nin match rows where the path is absent', () => {
    const compiled = compile({ path: 'status', op: 'nin', value: ['closed'] });
    expect(compiled.sql).toContain('IS NULL');
    // The whole branch must be parenthesised or the OR would escape the
    // surrounding AND and widen the result set.
    expect(compiled.sql.startsWith('(')).toBe(true);
    expect(compiled.sql.endsWith(')')).toBe(true);
  });

  it('rejects in / nin without a non empty array', () => {
    expect(() => compile({ path: 'status', op: 'in', value: 'open' })).toThrow(/array value/);
    expect(() => compile({ path: 'status', op: 'in', value: [] })).toThrow(/array value/);
  });

  it('compiles between into an inclusive range', () => {
    const compiled = compile({
      path: 'score', op: 'between', value: [10, 20], valueType: 'number',
    });
    expect(compiled.sql).toContain('>=');
    expect(compiled.sql).toContain('<=');
  });

  it('rejects between without a pair', () => {
    expect(() => compile({ path: 'score', op: 'between', value: [10] })).toThrow(/from, to/);
  });

  it('compiles exists and isNull against the JSONB projection', () => {
    expect(compile({ path: 'phone', op: 'exists' }).sql).toContain('IS NOT NULL');
    expect(compile({ path: 'phone', op: 'isNull' }).sql).toContain("'null'::jsonb");
  });

  it('rejects an unknown operator', () => {
    expect(() => compile({ path: 'x', op: 'regex' as never, value: 'y' }))
      .toThrow(/Unsupported submission filter operator/);
  });

  it('joins an and group with AND', () => {
    const compiled = compile({
      and: [
        { path: 'country', op: 'eq', value: 'ZA' },
        { path: 'score', op: 'gte', value: 80, valueType: 'number' },
      ],
    });
    expect(compiled.sql).toContain(' AND ');
    expect(Object.values(compiled.params)).toContain('ZA');
    expect(Object.values(compiled.params)).toContain(80);
  });

  it('joins an or group with OR', () => {
    const compiled = compile({
      or: [
        { path: 'country', op: 'eq', value: 'ZA' },
        { path: 'country', op: 'eq', value: 'GB' },
      ],
    });
    expect(compiled.sql).toContain(' OR ');
  });

  it('negates a not group', () => {
    const compiled = compile({ not: { path: 'country', op: 'eq', value: 'ZA' } });
    expect(compiled.sql.startsWith('NOT (')).toBe(true);
  });

  it('supports nested groups', () => {
    const compiled = compile({
      and: [
        { path: 'country', op: 'eq', value: 'ZA' },
        { or: [
          { path: 'tier', op: 'eq', value: 'gold' },
          { path: 'tier', op: 'eq', value: 'platinum' },
        ] },
      ],
    } as SubmissionFilterNode);
    expect(compiled.sql).toContain(' AND ');
    expect(compiled.sql).toContain(' OR ');
  });

  it('rejects a group that declares more than one operator', () => {
    expect(() => compile({
      and: [{ path: 'a', op: 'exists' }],
      or: [{ path: 'b', op: 'exists' }],
    })).toThrow(/exactly one/);
  });

  it('rejects an empty group', () => {
    expect(() => compile({ and: [] })).toThrow(/at least one child/);
  });

  it('refuses a filter that exceeds the condition budget', () => {
    const conditions = Array.from({ length: 65 }, (_, index) => ({
      path: `field${index}`, op: 'exists' as const,
    }));
    expect(() => compile({ and: conditions })).toThrow(/maximum of 64 conditions/);
  });

  it('refuses a filter nested past the depth budget', () => {
    let node: SubmissionFilterNode = { path: 'a', op: 'exists' };
    for (let i = 0; i < 10; i += 1) node = { and: [node] } as SubmissionFilterNode;
    expect(() => compile(node)).toThrow(/nesting depth/);
  });

  it('generates a unique parameter name per bound value', () => {
    const compiled = compile({
      and: [
        { path: 'a', op: 'eq', value: '1' },
        { path: 'b', op: 'eq', value: '2' },
        { path: 'c', op: 'eq', value: '3' },
      ],
    });
    const names = Object.keys(compiled.params);
    expect(new Set(names).size).toBe(names.length);
  });
});
