/**
 * Unit tests for the relational-database steps (mysql / postgres / mssql).
 *
 * These use a mock ReactorySQLService (no real database) to verify the
 * step → service contract: config resolution, the request passed to the
 * service, output normalization, and validation.
 */

import { MySqlStep } from '../../steps/core/MySqlStep';
import { PostgresSQLStep } from '../../steps/core/PostgresSQLStep';
import { MSSQLStep } from '../../steps/core/MSSQLStep';
import { YamlStepRegistry } from '../../steps/registry/YamlStepRegistry';

function makeContext(sqlService: any, overrides: any = {}) {
  return {
    inputs: {},
    workflowInputs: {},
    variables: {},
    env: {},
    stepResults: {},
    workflow: { id: 't', instanceId: 't', nameSpace: 'test', name: 'sql', version: '1.0.0' },
    logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    reactoryContext: {
      getService: (id: string) => (id === 'core.ReactorySQLService@1.0.0' ? sqlService : null),
    },
    ...overrides,
  } as any;
}

describe('SQL steps', () => {
  it('registers mysql, postgres and mssql step types', () => {
    const registry = new YamlStepRegistry();
    expect(registry.hasStep('mysql')).toBe(true);
    expect(registry.hasStep('postgres')).toBe(true);
    expect(registry.hasStep('mssql')).toBe(true);
  });

  it('passes engine, sql and parameters to the SQL service and returns rows', async () => {
    const query = jest.fn(async () => ({ rows: [{ id: 1, name: 'ada' }], rowCount: 1, fields: [{ name: 'id' }] }));
    const step = new MySqlStep('q1', {
      sql: 'SELECT * FROM users WHERE status = ?',
      parameters: ['active'],
      connectionId: 'default',
    });

    const result = await step.execute(makeContext({ query }));

    expect(result.success).toBe(true);
    expect(result.outputs.rows).toEqual([{ id: 1, name: 'ada' }]);
    expect(result.outputs.rowCount).toBe(1);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        engine: 'mysql',
        sql: 'SELECT * FROM users WHERE status = ?',
        parameters: ['active'],
        connectionId: 'default',
      }),
    );
  });

  it('sets the correct engine per subclass', async () => {
    const query = jest.fn(async () => ({ rows: [], rowCount: 0 }));
    await new PostgresSQLStep('p', { sql: 'SELECT 1' }).execute(makeContext({ query }));
    await new MSSQLStep('m', { sql: 'SELECT 1' }).execute(makeContext({ query }));
    expect(query.mock.calls[0][0].engine).toBe('postgres');
    expect(query.mock.calls[1][0].engine).toBe('mssql');
  });

  it('resolves template parameters from variables before querying', async () => {
    const query = jest.fn(async () => ({ rows: [], rowCount: 0 }));
    const ctx = makeContext({ query });
    ctx.variables.userId = '42';
    const step = new PostgresSQLStep('p', {
      sql: 'SELECT * FROM users WHERE id = $1',
      parameters: ['${userId}'],
    });
    await step.execute(ctx);
    expect(query.mock.calls[0][0].parameters).toEqual(['42']);
  });

  it('fails gracefully when the SQL service is unavailable', async () => {
    const step = new MySqlStep('q', { sql: 'SELECT 1' });
    const ctx = makeContext(null);
    ctx.reactoryContext.getService = () => null;
    const result = await step.execute(ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('SQL service');
  });

  it('reports query errors as a failed result', async () => {
    const query = jest.fn(async () => {
      throw new Error('syntax error near SELCT');
    });
    const result = await new MySqlStep('q', { sql: 'SELCT 1' }).execute(makeContext({ query }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('syntax error');
  });

  it('validates that sql is required', () => {
    const step = new MySqlStep('q', {} as any);
    const v = step.validateConfig({});
    expect(v.valid).toBe(false);
    expect(v.errors.join(' ')).toContain('sql');
  });
});
