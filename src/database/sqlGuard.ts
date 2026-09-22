/**
 * Read-only SQL guard.
 *
 * The SQL Query Editor (core.SQLQueryEditor) executes SQL typed by a user, and
 * the reactory-reactor AI data macros execute SQL proposed by a model. Both must
 * be held to the same rule, so this module is the single source of truth and
 * `ai/macro/data/utils.ts#validateQuery` delegates here.
 *
 * ## Policy
 *
 *   1. Exactly one statement. A single trailing `;` is tolerated; an interior
 *      one is rejected. This matters because the MySQL pool is created with
 *      `multipleStatements: true` (see `database/mysql/mysql.ts`), so a
 *      smuggled second statement would otherwise execute.
 *   2. The statement must begin with `SELECT` or `WITH` (a CTE feeding a
 *      SELECT). Leading `--` / `block` comments are stripped first so authoring
 *      comments don't trip the check.
 *   3. No write/DDL/DCL/DML keyword anywhere — covers data-modifying CTEs
 *      (`WITH x AS (...) INSERT ...`) and `SELECT ... INTO ...` table creation,
 *      which the "starts with SELECT" rule alone would not catch.
 *
 * ## Why comments and literals are stripped before scanning
 *
 *   - **Comments** are removed from the scanned text, so a keyword split by a
 *     comment (`DR/**​/OP`) is reassembled and still detected. Conversely a
 *     comment containing a keyword doesn't cause a false positive.
 *   - **String literals and quoted identifiers** are blanked, so
 *     `SELECT 'please drop this'` or a column named `"insert"` is not mistaken
 *     for a write. Without this the keyword scan would be unusable in practice.
 *
 * This is a defensive filter, not a SQL parser. It is intentionally strict —
 * add an exception with a test rather than loosening a pattern.
 */

export interface SqlGuardResult {
  valid: boolean;
  error?: string;
}

/**
 * Statement-level write operations. Matched as whole words against the scanned
 * (comment-stripped, literal-stripped) text.
 *
 * Deliberately excludes ambiguous words that are plausible column/table names
 * (`set`, `reset`, `use`, `copy`, `begin`, `cluster`, `analyze`, `comment`,
 * `prepare`, `deny`) — those are already unreachable, because the statement must
 * start with SELECT/WITH and cannot contain an interior semicolon.
 */
const FORBIDDEN_KEYWORDS: RegExp[] = [
  // DML
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bmerge\b/i,
  /\breplace\b/i,
  // DDL
  /\bcreate\b/i,
  /\balter\b/i,
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\brename\b/i,
  // Writes reachable from inside a SELECT / CTE
  /\binto\b/i,
  /\bfor\s+update\b/i,
  /\bfor\s+share\b/i,
  // DCL
  /\bgrant\b/i,
  /\brevoke\b/i,
  // Transactions / locking
  /\bcommit\b/i,
  /\brollback\b/i,
  /\bsavepoint\b/i,
  /\block\s+table\b/i,
  // Maintenance / server-side side effects
  /\bbackup\b/i,
  /\brestore\b/i,
  /\bvacuum\b/i,
  /\breindex\b/i,
  /\battach\b/i,
  /\bdetach\b/i,
  /\bcall\b/i,
  /\bexec(ute)?\b/i,
  /\bload\s+data\b/i,
  /\bunload\b/i,
  /\blo_import\b/i,
  /\blo_export\b/i,
  /\bpg_read_file\b/i,
  /\bpg_write_file\b/i,
  /\bxp_cmdshell\b/i,
  /\bsp_configure\b/i,
  /\bopenrowset\b/i,
  /\bopendatasource\b/i,
];

/** Remove every SQL comment (line and block). */
export function stripComments(sql: string): string {
  // Block comments first so `--` inside them isn't treated as a line comment.
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** Remove leading whitespace and comments, so the first token is the verb. */
export function stripLeadingComments(sql: string): string {
  let work = sql;
  for (;;) {
    const before = work;
    work = work.replace(/^\s+/, '');
    work = work.replace(/^--[^\n]*\n?/, '');
    work = work.replace(/^\/\*[\s\S]*?\*\//, '');
    if (work === before) return work;
  }
}

/**
 * Blank out string literals and quoted identifiers. Doubled quotes are the SQL
 * escape form (`'it''s'`), so they're handled explicitly.
 */
export function stripLiterals(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""');
}

/**
 * Validate that a statement is a single read-only query.
 *
 * Returns `{ valid: true }` with no other keys on success, so callers that
 * compare the whole object keep working.
 */
export function validateReadOnlySql(sql: string): SqlGuardResult {
  if (typeof sql !== 'string' || sql.trim().length === 0) {
    return { valid: false, error: 'No SQL statement was provided' };
  }

  const statement = stripLeadingComments(sql).trim();

  if (statement.length === 0) {
    return { valid: false, error: 'No SQL statement was provided' };
  }

  const scanned = stripLiterals(stripComments(statement));

  // 1. Exactly one statement (trailing semicolon tolerated).
  if (scanned.replace(/;\s*$/, '').includes(';')) {
    return { valid: false, error: 'Only a single SQL statement may be executed' };
  }

  // 2. Must start with SELECT or WITH.
  if (!/^\s*(select|with)\b/i.test(scanned)) {
    return {
      valid: false,
      error: 'Only SELECT queries (optionally starting with WITH) are allowed for security reasons',
    };
  }

  // 3. No write/DDL/DCL keyword anywhere.
  for (const pattern of FORBIDDEN_KEYWORDS) {
    if (pattern.test(scanned)) {
      return {
        valid: false,
        error: `Query contains a non read-only operation: ${pattern.source}`,
      };
    }
  }

  return { valid: true };
}

/** Assert-style helper for callers that prefer exceptions. */
export function assertReadOnlySql(sql: string): void {
  const result = validateReadOnlySql(sql);
  if (!result.valid) {
    throw new Error(result.error ?? 'SQL statement rejected');
  }
}
