// Baseline migration for the reactory_clients collection.
//
// WHY: Establishes the indexes that the ReactoryClient Mongoose schema
// declares (key: unique) and ensures every document has the array fields
// introduced over time (featureFlags, plugins, whitelist, auth_config).
// Safe to re-run — all updateMany calls are guarded with $exists checks.

const COLLECTION = 'reactory_clients';

const isKeyAscIndex = (index) => {
  const keys = index?.key || {};
  const keyNames = Object.keys(keys);
  return keyNames.length === 1 && keyNames[0] === 'key' && keys.key === 1;
};

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async up(db) {
    const col = db.collection(COLLECTION);

    // 1. Unique index on `key` (lowercased client identifier).
    //    Handle existing index-name drift across environments (e.g. key_1 vs key_unique).
    const indexes = await col.indexes();
    const existingKeyIndex = indexes.find(isKeyAscIndex);

    if (existingKeyIndex) {
      if (!existingKeyIndex.unique) {
        throw new Error(
          "Cannot apply migration: existing index on { key: 1 } is not unique. " +
          "Please drop/replace it with a unique index before rerunning."
        );
      }
      // Existing unique { key: 1 } index is valid; do not recreate with a different name.
    } else {
      await col.createIndex(
        { key: 1 },
        { unique: true, name: 'key_unique', background: true }
      );
    }

    // 2. Backfill `featureFlags` — array added after initial launch.
    await col.updateMany(
      { featureFlags: { $exists: false } },
      { $set: { featureFlags: [] } }
    );

    // 3. Backfill `plugins` — array added alongside plugin system.
    await col.updateMany(
      { plugins: { $exists: false } },
      { $set: { plugins: [] } }
    );

    // 4. Backfill `whitelist` — IP/domain allow-list, defaults to open.
    await col.updateMany(
      { whitelist: { $exists: false } },
      { $set: { whitelist: [] } }
    );

    // 5. Backfill `auth_config` — authentication provider config array.
    await col.updateMany(
      { auth_config: { $exists: false } },
      { $set: { auth_config: [] } }
    );

    // 6. Backfill `applicationRoles` — client-level role definitions.
    await col.updateMany(
      { applicationRoles: { $exists: false } },
      { $set: { applicationRoles: [] } }
    );
  },

  /**
   * @param db {import('mongodb').Db}
   * @returns {Promise<void>}
   */
  async down(db) {
    const col = db.collection(COLLECTION);

    // Remove the index created in up().
    // The backfilled array fields are intentionally left in place on rollback
    // because removing them from existing documents could corrupt data
    // that was legitimately written after the migration ran.
    await col.dropIndex('key_unique').catch(async () => {
      // Older environments may have the same logical index with the default Mongo name.
      await col.dropIndex('key_1').catch(() => {
        // Ignore if neither index exists (e.g. partial rollback scenario).
      });
    });
  },
};
