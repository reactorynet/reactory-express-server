// Example skeleton — delete or adapt before running.
// Generated: initial migration scaffold
//
// WHY: migrate-mongo requires at least one migration file to verify the
// setup. This file demonstrates the up/down pattern without making
// any destructive changes to the database.

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} client
 */
async function up(db, client) {
  // Example: create an index that was previously missing
  // await db.collection('users').createIndex({ email: 1 }, { unique: true });
}

/**
 * @param {import('mongodb').Db} db
 * @param {import('mongodb').MongoClient} client
 */
async function down(db, client) {
  // Example: drop the index added in up()
  // await db.collection('users').dropIndex('email_1');
}

module.exports = { up, down };
