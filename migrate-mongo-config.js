// Server-level migrate-mongo configuration.
// This config covers ONLY the root ./migrations directory — schema-wide
// operations not owned by any individual module (e.g. initial baseline,
// cross-collection indexes that span multiple modules).
//
// Module-specific migrations live in:
//   src/modules/<module-key>/migrations/mongo/
//
// The bin/migrate.sh script generates per-module configs automatically
// from this template, using the active module list in
//   src/modules/enabled-<client_key>.json
//
// Each module's changelog is stored in a separate collection:
//   reactory_migrations_<module-key>
// while this server-level config uses:
//   reactory_migrations_server
//
// Reads the same MONGOOSE env var used by src/models/mongoose/index.ts

require('dotenv').config();

const {
  MONGOOSE,
  MONGO_USER,
  MONGO_PASSWORD,
} = process.env;

if (!MONGOOSE) {
  throw new Error('MONGOOSE environment variable is required for migrations.');
}

const config = {
  mongodb: {
    url: MONGOOSE,
    options: {
      auth: MONGO_USER && MONGO_PASSWORD
        ? { username: MONGO_USER, password: MONGO_PASSWORD }
        : undefined,
    },
  },

  // The migrations collection name (tracked in MongoDB)
  migrationsDir: 'migrations',

  // The collection in which migrate-mongo stores its applied migration history
  changelogCollectionName: 'reactory_migrations_server',

  // The file extension for migration files
  migrationFileExtension: '.js',

  // Enable ES module syntax in the migration files
  useFileHash: false,

  // Match the server's CommonJS module system (package.json "type": "commonjs")
  moduleSystem: 'commonjs',
};

module.exports = config;
