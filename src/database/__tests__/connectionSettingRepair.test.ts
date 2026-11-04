/**
 * Safety rules for the stored-connection repair.
 *
 * The repair tool writes to a live client document, so the properties that
 * matter are the ones that decide *whether* it writes: idempotency, refusal to
 * clobber a deliberate override, and never leaking a password into output.
 */
import {
  ConnectionData,
  HISTORICAL_MONGO_DEFAULT,
  diffConnectionData,
  isHistoricalMongoDefault,
  planConnectionSettingRepair,
  planMutates,
  redactConnectionData,
} from '../connectionSettingRepair';

const SETTING = 'reactory.mongodb.connection';
const SECRET = 'super-secret-value';

const target = (overrides: ConnectionData = {}) => ({
  settingName: SETTING,
  desired: {
    host: 'localhost',
    port: 27017,
    username: 'reactory',
    password: SECRET,
    database: 'reactory-reactory',
    options: { authSource: 'admin' },
    ...overrides,
  } as ConnectionData,
});

const staleDefault = (overrides: ConnectionData = {}): ConnectionData => ({
  host: 'localhost',
  port: 27017,
  username: '',
  password: '',
  database: 'reactory',
  variant: 'mongodb',
  ...overrides,
});

const repaired = (): ConnectionData => ({
  host: 'localhost',
  port: 27017,
  username: 'reactory',
  password: SECRET,
  database: 'reactory-reactory',
  options: { authSource: 'admin' },
  variant: 'mongo',
});

describe('isHistoricalMongoDefault', () => {
  it('recognises the shape the old default produced', () => {
    expect(isHistoricalMongoDefault(staleDefault())).toBe(true);
    expect(isHistoricalMongoDefault(HISTORICAL_MONGO_DEFAULT as ConnectionData)).toBe(true);
  });

  it('does not mistake a configured connection for the default', () => {
    expect(isHistoricalMongoDefault({ ...staleDefault(), database: 'production' })).toBe(false);
    expect(isHistoricalMongoDefault({ ...staleDefault(), username: 'ops' })).toBe(false);
    expect(isHistoricalMongoDefault({ ...staleDefault(), options: { authSource: 'admin' } })).toBe(false);
  });

  it('rejects absent data', () => {
    expect(isHistoricalMongoDefault(null)).toBe(false);
    expect(isHistoricalMongoDefault(undefined)).toBe(false);
  });
});

describe('redactConnectionData', () => {
  it('masks a set password and leaves an empty one empty', () => {
    const redacted = redactConnectionData({ ...repaired() }) as ConnectionData;

    expect(redacted.password).toBe('<redacted>');
    expect(redactConnectionData({ ...staleDefault() })?.password).toBe('');
  });

  it('never returns the secret in any field', () => {
    expect(JSON.stringify(redactConnectionData({ ...repaired() }))).not.toContain(SECRET);
  });

  it('returns null for missing data', () => {
    expect(redactConnectionData(null)).toBeNull();
    expect(redactConnectionData(undefined)).toBeNull();
  });
});

describe('diffConnectionData', () => {
  it('names every field that differs, including options', () => {
    expect(diffConnectionData(staleDefault(), target().desired).sort()).toEqual([
      'database',
      'options',
      'password',
      'username',
    ]);
  });

  it('is empty when the values agree', () => {
    expect(diffConnectionData({ ...repaired() }, target().desired)).toEqual([]);
  });

  it('compares port numerically, so a string 27017 is not a change', () => {
    const stored = { ...repaired(), port: '27017' as unknown as number };

    expect(diffConnectionData(stored, target().desired)).toEqual([]);
  });
});

describe('planConnectionSettingRepair', () => {
  it('repairs the historical default and names what changes', () => {
    const plan = planConnectionSettingRepair(staleDefault(), target());

    expect(plan.decision).toBe('repair-stale-default');
    expect(planMutates(plan)).toBe(true);
    expect(plan.changedFields).toEqual(expect.arrayContaining(['database', 'username', 'password', 'options']));
    expect(plan.current?.database).toBe('reactory');
    expect(plan.desired.database).toBe('reactory-reactory');
  });

  it('normalises the declared mongodb variant to the canonical spelling', () => {
    const plan = planConnectionSettingRepair(staleDefault(), target());

    expect(plan.normalisedVariant).toEqual({ from: 'mongodb', to: 'mongo' });
  });

  it('honours --keep-variant', () => {
    const plan = planConnectionSettingRepair(staleDefault(), target(), { keepVariant: true });

    expect(plan.normalisedVariant).toBeUndefined();
    expect(plan.decision).toBe('repair-stale-default');
  });

  it('is idempotent: planning against its own output writes nothing', () => {
    const plan = planConnectionSettingRepair(repaired(), target());

    expect(plan.decision).toBe('already-correct');
    expect(planMutates(plan)).toBe(false);
    expect(plan.changedFields).toEqual([]);
  });

  it('treats a variant-only difference as a change worth applying', () => {
    const stored = { ...repaired(), variant: 'mongodb' };
    const plan = planConnectionSettingRepair(stored, target());

    // A stale alias alone still needs the write, or the setting stays on the
    // spelling the deployed macro rejects. It must not be refused as though the
    // data were an operator override - the data is already correct.
    expect(plan.decision).toBe('normalise-variant');
    expect(planMutates(plan)).toBe(true);
    expect(plan.normalisedVariant).toEqual({ from: 'mongodb', to: 'mongo' });
  });

  it('does not mutate a correct setting when --keep-variant is used', () => {
    const stored = { ...repaired(), variant: 'mongodb' };
    const plan = planConnectionSettingRepair(stored, target(), { keepVariant: true });

    expect(plan.decision).toBe('already-correct');
    expect(planMutates(plan)).toBe(false);
  });

  it('refuses to overwrite what looks like an operator override', () => {
    const stored = { ...staleDefault(), database: 'reactory-production', username: 'ops' };
    const plan = planConnectionSettingRepair(stored, target());

    expect(plan.decision).toBe('refuse-override');
    expect(planMutates(plan)).toBe(false);
    expect(plan.reason).toContain('--force');
    expect(plan.changedFields.length).toBeGreaterThan(0);
  });

  it('overwrites an override only with force', () => {
    const stored = { ...staleDefault(), database: 'reactory-production', username: 'ops' };
    const plan = planConnectionSettingRepair(stored, target(), { force: true });

    expect(plan.decision).toBe('replace-override');
    expect(planMutates(plan)).toBe(true);
  });

  it('refuses to create a setting that is not there', () => {
    const plan = planConnectionSettingRepair(null, target(), { force: true });

    expect(plan.decision).toBe('refuse-override');
    expect(planMutates(plan)).toBe(false);
    expect(plan.current).toBeNull();
  });

  it('never puts the secret into a plan', () => {
    const plan = planConnectionSettingRepair(staleDefault(), target());
    const serialised = JSON.stringify(plan);

    expect(serialised).not.toContain(SECRET);
    expect(plan.desired.password).toBe('<redacted>');
    expect(plan.current?.password).toBe('');
  });
});
