/* Read-only inspection of the AI usage data store. */
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.REACTORY_POSTGRES_HOST || 'localhost',
    port: Number(process.env.REACTORY_POSTGRES_PORT || 5432),
    user: process.env.REACTORY_POSTGRES_USER,
    password: process.env.REACTORY_POSTGRES_PASSWORD,
    database: process.env.REACTORY_POSTGRES_DB,
  });
  await client.connect();

  const q = async (label, sql) => {
    try {
      const res = await client.query(sql);
      console.log(`\n== ${label} ==`);
      console.table ? console.log(JSON.stringify(res.rows, null, 1)) : console.log(res.rows);
    } catch (err) {
      console.log(`\n== ${label} == ERROR: ${err.message}`);
    }
  };

  await q('message counts', `
    SELECT
      COUNT(*)::int AS all_messages,
      COUNT(*) FILTER (WHERE role = 'assistant')::int AS assistant,
      COUNT(*) FILTER (WHERE role = 'assistant'
        AND provider_response -> 'usage' IS NOT NULL
        AND jsonb_typeof(provider_response -> 'usage') = 'object')::int AS assistant_with_usage,
      COUNT(DISTINCT user_id)::int AS distinct_users,
      MIN(created_at)::text AS first_msg,
      MAX(created_at)::text AS last_msg
    FROM reactor_conversation_messages`);

  await q('usage envelope sample', `
    SELECT role, usage_source, provider_id, model_id, user_id, cost_usd_cents,
           provider_response -> 'usage' AS usage
    FROM reactor_conversation_messages
    WHERE provider_response -> 'usage' IS NOT NULL
    LIMIT 3`);

  await q('assistant rows by provider', `
    SELECT COALESCE(provider_id, '(null)') AS provider,
           COALESCE(model_id, '(null)') AS model,
           COUNT(*)::int AS rows,
           COUNT(cost_usd_cents)::int AS priced,
           COALESCE(SUM(cost_usd_cents), 0)::text AS cost_cents
    FROM reactor_conversation_messages
    WHERE role = 'assistant'
    GROUP BY 1, 2
    ORDER BY rows DESC
    LIMIT 15`);

  await q('assistant rows missing usage', `
    SELECT COUNT(*)::int AS assistant_without_usage
    FROM reactor_conversation_messages
    WHERE role = 'assistant'
      AND (provider_response -> 'usage' IS NULL
           OR jsonb_typeof(provider_response -> 'usage') <> 'object')`);

  await q('failures table', `SELECT COUNT(*)::int AS failures FROM reactor_ai_failures`);

  await client.end();
})().catch((err) => {
  console.error('inspection failed:', err.message);
  process.exit(1);
});
