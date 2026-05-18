// Reactory Core Mongo index baseline migration.
//
// WHY: Ensure declared schema indexes exist in environments where collections
// were created over time and index names/options may differ.
//
// Scope:
// - reactory_feature_flags
// - reactory_statistics
// - reactory_menus
// - reactory_email_queue
// - reactory_users

const COLLECTIONS = {
  featureFlags: "reactory_feature_flags",
  statistics: "reactory_statistics",
  menus: "reactory_menus",
  emailQueue: "reactory_email_queue",
  users: "reactory_users",
};

const keyEquals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const findIndexByKey = (indexes, key) => indexes.find((idx) => keyEquals(idx.key, key));

const ensureIndex = async (col, indexes, key, options = {}) => {
  const existing = findIndexByKey(indexes, key);

  if (existing) {
    if (options.unique === true && existing.unique !== true) {
      throw new Error(
        `Conflicting index on ${col.collectionName} ${JSON.stringify(key)}: expected unique=true.`
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(options, "expireAfterSeconds") &&
      existing.expireAfterSeconds !== options.expireAfterSeconds
    ) {
      throw new Error(
        `Conflicting TTL index on ${col.collectionName} ${JSON.stringify(key)}: ` +
        `expected expireAfterSeconds=${options.expireAfterSeconds}, got ${existing.expireAfterSeconds}.`
      );
    }

    if (options.sparse === true && existing.sparse !== true) {
      throw new Error(
        `Conflicting sparse index on ${col.collectionName} ${JSON.stringify(key)}: expected sparse=true.`
      );
    }

    return;
  }

  await col.createIndex(key, options);
  indexes.push({ key, ...options });
};

const hasTextIndexForFields = (indexes, fields) => {
  const expected = fields.reduce((acc, field) => {
    acc[field] = 1;
    return acc;
  }, {});

  return indexes.some((idx) => {
    if (!idx.weights) {
      return false;
    }
    return keyEquals(idx.weights, expected);
  });
};

module.exports = {
  /**
   * @param {import('mongodb').Db} db
   */
  async up(db) {
    // reactory_feature_flags
    {
      const col = db.collection(COLLECTIONS.featureFlags);
      const indexes = await col.indexes();
      await ensureIndex(col, indexes, { nameSpace: 1 }, { name: "nameSpace_1", background: true });
      await ensureIndex(col, indexes, { name: 1 }, { name: "name_1", background: true });
    }

    // reactory_statistics
    {
      const col = db.collection(COLLECTIONS.statistics);
      const indexes = await col.indexes();

      await ensureIndex(col, indexes, { name: 1 }, { name: "name_1", background: true });
      await ensureIndex(col, indexes, { type: 1 }, { name: "type_1", background: true });
      await ensureIndex(col, indexes, { timestamp: 1 }, { name: "timestamp_1", background: true });

      await ensureIndex(
        col,
        indexes,
        { expiresAt: 1 },
        { name: "expiresAt_ttl", expireAfterSeconds: 0, background: true }
      );

      await ensureIndex(
        col,
        indexes,
        { name: 1, type: 1, timestamp: -1 },
        { name: "name_1_type_1_timestamp_-1", background: true }
      );

      await ensureIndex(
        col,
        indexes,
        { "resource.serviceName": 1, name: 1, timestamp: -1 },
        { name: "resource.serviceName_1_name_1_timestamp_-1", background: true }
      );

      await ensureIndex(
        col,
        indexes,
        { attributes: 1 },
        { name: "attributes_1", sparse: true, background: true }
      );
    }

    // reactory_menus
    {
      const col = db.collection(COLLECTIONS.menus);
      const indexes = await col.indexes();
      await ensureIndex(
        col,
        indexes,
        { client: 1, key: -1 },
        { name: "client_1_key_-1", background: true }
      );
    }

    // reactory_email_queue text index
    {
      const col = db.collection(COLLECTIONS.emailQueue);
      const indexes = await col.indexes();
      const fields = ["to", "from", "subject", "message"];

      if (!hasTextIndexForFields(indexes, fields)) {
        await col.createIndex(
          { to: "text", from: "text", subject: "text", message: "text" },
          { name: "to_text_from_text_subject_text_message_text", background: true }
        );
      }
    }

    // reactory_users
    {
      const col = db.collection(COLLECTIONS.users);
      const indexes = await col.indexes();
      await ensureIndex(
        col,
        indexes,
        { username: 1 },
        { name: "username_1", unique: true, background: true }
      );
      await ensureIndex(
        col,
        indexes,
        { email: 1 },
        { name: "email_1", unique: true, background: true }
      );
    }
  },

  /**
   * @param {import('mongodb').Db} db
   */
  async down(db) {
    // Intentionally conservative rollback: do not drop long-lived baseline indexes
    // that may already be relied upon by production query paths.
    // This migration is effectively forward-only.
  },
};
