import {
  validateReadOnlySql,
  assertReadOnlySql,
  stripComments,
  stripLiterals,
  stripLeadingComments,
} from '../sqlGuard';

describe('validateReadOnlySql — accepted statements', () => {
  it.each([
    ['plain select', 'SELECT * FROM users'],
    ['lowercase', 'select id from users'],
    ['mixed case', 'Select * From users'],
    ['joins and subqueries', 'SELECT u.name FROM users u JOIN orders o ON u.id = o.user_id'],
    ['aggregate', 'SELECT count(*) AS total FROM information_schema.tables'],
    ['CTE feeding a select', 'WITH recent AS (SELECT id FROM orders) SELECT * FROM recent'],
    ['trailing semicolon', 'SELECT 1;'],
    ['trailing semicolon with whitespace', 'SELECT 1;   '],
    ['schema qualified', 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\''],
  ])('accepts %s', (_label, sql) => {
    expect(validateReadOnlySql(sql)).toEqual({ valid: true });
  });

  it('accepts a statement with leading line comments', () => {
    expect(validateReadOnlySql('-- report\nSELECT 1')).toEqual({ valid: true });
  });

  it('accepts a statement with a leading block comment', () => {
    expect(validateReadOnlySql('/* monthly report */ SELECT 1')).toEqual({ valid: true });
  });

  it('accepts a keyword that only appears inside a string literal', () => {
    // The literal is blanked before scanning, so this is not a false positive.
    expect(validateReadOnlySql("SELECT 'please drop table users' AS msg")).toEqual({ valid: true });
  });

  it('accepts a quoted identifier that looks like a keyword', () => {
    expect(validateReadOnlySql('SELECT "insert" FROM t')).toEqual({ valid: true });
  });
});

describe('validateReadOnlySql — rejected statements', () => {
  it('rejects an empty statement', () => {
    expect(validateReadOnlySql('').valid).toBe(false);
    expect(validateReadOnlySql('   ').valid).toBe(false);
  });

  it('rejects a non-string input', () => {
    expect(validateReadOnlySql(undefined as unknown as string).valid).toBe(false);
  });

  it('rejects a comment-only statement', () => {
    expect(validateReadOnlySql('-- nothing here').valid).toBe(false);
  });

  it('rejects a query that does not start with SELECT or WITH', () => {
    const result = validateReadOnlySql("INSERT INTO users (name) VALUES ('x')");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('SELECT');
  });

  it.each([
    ['drop table', 'DROP TABLE users'],
    ['drop database', 'DROP DATABASE mydb'],
    ['truncate', 'TRUNCATE TABLE users'],
    ['alter table', 'ALTER TABLE users ADD COLUMN x INT'],
    ['create table', 'CREATE TABLE t (id INT)'],
    ['grant', 'GRANT ALL ON users TO hacker'],
    ['revoke', 'REVOKE ALL ON users FROM admin'],
    ['backup', 'BACKUP DATABASE mydb'],
    ['restore', 'RESTORE DATABASE mydb'],
  ])('rejects %s', (_label, sql) => {
    expect(validateReadOnlySql(sql).valid).toBe(false);
  });

  it('rejects multiple statements (MySQL pool has multipleStatements enabled)', () => {
    const result = validateReadOnlySql('SELECT 1; DROP TABLE users');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('single SQL statement');
  });

  it('rejects a keyword obfuscated with an inline comment', () => {
    // Comment stripping reassembles the keyword, so this cannot evade the scan.
    expect(validateReadOnlySql('SELECT 1; DR/**/OP TABLE users').valid).toBe(false);
  });

  it('rejects a data-modifying CTE', () => {
    const result = validateReadOnlySql('WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x');
    expect(result.valid).toBe(false);
  });

  it('rejects SELECT ... INTO OUTFILE (file write)', () => {
    expect(validateReadOnlySql("SELECT * FROM users INTO OUTFILE '/tmp/x.csv'").valid).toBe(false);
  });

  it('rejects SELECT ... INTO <table> (table creation)', () => {
    expect(validateReadOnlySql('SELECT * INTO new_users FROM users').valid).toBe(false);
  });

  it('rejects row locking clauses', () => {
    expect(validateReadOnlySql('SELECT * FROM users FOR UPDATE').valid).toBe(false);
  });

  it('rejects server-side command execution helpers', () => {
    expect(validateReadOnlySql("SELECT xp_cmdshell('whoami')").valid).toBe(false);
    expect(validateReadOnlySql("SELECT pg_read_file('/etc/passwd')").valid).toBe(false);
  });

  it('rejects a semicolon hidden inside a string literal', () => {
    // Literal-aware statement split: the literal is blanked before counting.
    expect(validateReadOnlySql("SELECT 'a;b' AS x").valid).toBe(true);
  });
});

describe('assertReadOnlySql', () => {
  it('does not throw for a read-only statement', () => {
    expect(() => assertReadOnlySql('SELECT 1')).not.toThrow();
  });

  it('throws with the guard reason for a write statement', () => {
    expect(() => assertReadOnlySql('DROP TABLE users')).toThrow(/read-only|SELECT/i);
  });
});

describe('helpers', () => {
  it('stripComments removes line and block comments', () => {
    // Whitespace is not normalised, so compare on collapsed whitespace.
    const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();
    expect(normalise(stripComments('SELECT 1 -- trailing\n/* block */ FROM t'))).toBe('SELECT 1 FROM t');
  });

  it('stripLeadingComments removes leading comments but keeps the body', () => {
    expect(stripLeadingComments('-- a\n/* b */ SELECT 1').trim()).toBe('SELECT 1');
  });

  it('stripLiterals blanks single- and double-quoted values', () => {
    expect(stripLiterals(`SELECT 'abc', "def" FROM t`)).toBe(`SELECT '', "" FROM t`);
  });

  it('stripLiterals handles SQL escaped quotes', () => {
    expect(stripLiterals("SELECT 'it''s here' FROM t")).toBe("SELECT '' FROM t");
  });
});
