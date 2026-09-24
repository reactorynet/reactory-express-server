/**
 * DocumentDB compatibility probe (WP-B4).
 *
 * Runs one small operation for every MongoDB feature the server uses, against
 * the configured target, in a scratch database it drops afterwards. On Amazon
 * DocumentDB a feature it lacks fails here, with the files that use it, rather
 * than in production.
 *
 * Why a probe and not the Jest suite: the Mongo-backed specs mock the models,
 * so they never send a query, and the few that do connect seed data into the
 * database they are pointed at.
 *
 *   bin/check-documentdb.sh [--uri <mongodb uri>] [--db <scratch db>] [--keep]
 *
 * Connection: --uri, else MONGOOSE, with MONGO_USER / MONGO_PASSWORD and the
 * REACTORY_MONGO_* settings from src/database/connectionOptions.ts, as the
 * server connects. The scratch database defaults to reactory_compat_probe.
 *
 * Not probed because the server does not use them (checked 2026-09-24):
 * change streams and multi-document transactions. The file scan below reports
 * them if that changes.
 */
import fs from 'fs';
import path from 'path';
import { Db, MongoClient } from 'mongodb';
import { describeConnectionSecurity, mongoClientOptions } from '../../src/database/connectionOptions';

const argv = process.argv.slice(2);
const arg = (name: string) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
const uri = arg('--uri') || process.env.MONGOOSE;
const scratchDb = arg('--db') || 'reactory_compat_probe';
const keep = argv.includes('--keep');

const SRC = path.resolve(__dirname, '../../src');

/** Source files that match a pattern, for the report. Tests and dependencies excluded. */
const sourceFiles: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|js)$/.test(entry.name) && !/\.(test|spec)\.(ts|js)$/.test(entry.name)) sourceFiles.push(full);
  }
};
const usedIn = (pattern: RegExp): string[] =>
  sourceFiles.filter((file) => pattern.test(fs.readFileSync(file, 'utf8'))).map((file) => path.relative(SRC, file));

interface Probe {
  feature: string;
  /** Finds the code that depends on the feature. */
  pattern: RegExp;
  run: (db: Db) => Promise<unknown>;
}

const docs = () => [
  {
    _id: 1, userId: 10, a: 1, b: 2, retryCount: 3, maxRetries: 3, riskLevel: 'low', totalScore: 10,
    tags: ['x', 'y'], subject: 'hello world', message: 'quarterly report', createdAt: new Date('2026-01-15'),
    content: [{ type: 'text', text: 'abc' }], tool_calls: [1, 2],
  },
  {
    _id: 2, userId: 11, a: 5, b: 2, retryCount: 0, maxRetries: 3, riskLevel: 'high', totalScore: 80,
    tags: ['y'], subject: 'other', message: 'nothing here', createdAt: new Date('2026-02-20'),
    content: 'plain string', tool_calls: [],
  },
];

const aggregate = (db: Db, pipeline: object[]) => db.collection('probe_docs').aggregate(pipeline).toArray();

const probes: Probe[] = [
  {
    feature: 'writes with the configured retryWrites',
    pattern: /\.(save|create|insertOne|insertMany|updateOne|findOneAndUpdate)\(/,
    run: (db) => db.collection('probe_writes').insertOne({ at: new Date() }),
  },
  {
    feature: 'update operators ($set $unset $inc $push $pull $addToSet $setOnInsert, upsert)',
    pattern: /\$(setOnInsert|addToSet|pull)\b/,
    run: async (db) => {
      const c = db.collection('probe_writes');
      await c.updateOne({ _id: 'u' as any }, { $setOnInsert: { n: 0, list: [] } }, { upsert: true });
      await c.updateOne({ _id: 'u' as any }, { $inc: { n: 1 }, $push: { list: 'a' } as any, $set: { s: 1 } });
      await c.updateOne({ _id: 'u' as any }, { $addToSet: { list: 'b' } as any, $unset: { s: '' } });
      await c.updateOne({ _id: 'u' as any }, { $pull: { list: 'a' } as any });
    },
  },
  {
    feature: 'findOneAndUpdate returning the new document',
    pattern: /findOneAndUpdate\(/,
    run: (db) => db.collection('probe_writes').findOneAndUpdate({ _id: 'u' as any }, { $inc: { n: 1 } }, { returnDocument: 'after' }),
  },
  {
    feature: 'query operators ($in $nin $all $elemMatch $regex $exists $type)',
    pattern: /\$(elemMatch|all|nin)\b/,
    run: (db) => db.collection('probe_docs').find({
      tags: { $all: ['y'] }, _id: { $nin: [99] }, subject: { $regex: '^hel', $options: 'i' },
      a: { $exists: true, $type: 'number' }, content: { $elemMatch: { type: 'text' } },
    }).toArray(),
  },
  {
    feature: '$expr comparing two fields in find()',
    pattern: /\$expr\b/,
    run: (db) => db.collection('probe_docs').find({ $expr: { $gte: ['$retryCount', '$maxRetries'] } }).toArray(),
  },
  {
    feature: '$lookup (localField / foreignField) with $unwind and $arrayElemAt',
    pattern: /\$lookup\b/,
    run: (db) => aggregate(db, [
      { $lookup: { from: 'probe_join', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$user.firstName', firstTag: { $arrayElemAt: ['$tags', 0] } } },
    ]),
  },
  {
    feature: '$facet',
    pattern: /\$facet\b/,
    run: (db) => aggregate(db, [{
      $facet: {
        totals: [{ $group: { _id: null, total: { $sum: 1 }, avg: { $avg: '$totalScore' } } }],
        byLevel: [{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }],
      },
    }]),
  },
  {
    feature: '$bucket',
    pattern: /\$bucket\b/,
    run: (db) => aggregate(db, [{ $bucket: { groupBy: '$totalScore', boundaries: [0, 50, 101], default: 'other', output: { count: { $sum: 1 } } } }]),
  },
  {
    feature: 'grouping and arithmetic ($group $sum $avg $min $max $push $divide $multiply $add $subtract)',
    pattern: /\$group\b/,
    run: (db) => aggregate(db, [
      { $group: { _id: null, s: { $sum: '$a' }, lo: { $min: '$a' }, hi: { $max: '$a' }, all: { $push: '$a' } } },
      { $project: { r: { $divide: [{ $multiply: [{ $add: ['$s', 1] }, 2] }, { $subtract: ['$hi', '$lo'] }] } } },
    ]),
  },
  {
    feature: 'dates ($dateToString $year $month)',
    pattern: /\$dateToString\b/,
    run: (db) => aggregate(db, [{ $project: { d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, y: { $year: '$createdAt' }, m: { $month: '$createdAt' } } }]),
  },
  {
    feature: 'token estimate expressions ($reduce $isArray $strLenCP $convert $cond $ifNull)',
    pattern: /\$reduce\b/,
    run: (db) => aggregate(db, [{
      $addFields: {
        chars: {
          $cond: {
            if: { $isArray: '$content' },
            then: { $reduce: { input: '$content', initialValue: 0, in: { $add: ['$$value', { $strLenCP: { $ifNull: ['$$this.text', ''] } }] } } },
            else: { $strLenCP: { $convert: { input: '$content', to: 'string', onError: '', onNull: '' } } },
          },
        },
      },
    }]),
  },
  {
    feature: 'array expressions ($filter $size $type $toString)',
    pattern: /\$filter\b|\$toString\b/,
    run: (db) => aggregate(db, [{ $project: { n: { $size: { $filter: { input: '$tool_calls', as: 't', cond: { $gt: ['$$t', 1] } } } }, t: { $type: '$content' }, id: { $toString: '$_id' } } }]),
  },
  {
    feature: '$bsonSize',
    pattern: /\$bsonSize\b/,
    run: (db) => aggregate(db, [{ $group: { _id: null, bytes: { $sum: { $bsonSize: '$$ROOT' } } } }]),
  },
  {
    feature: 'compound text index and $text search',
    pattern: /['"]text['"]\s*[,}]|\$text\b/,
    run: async (db) => {
      await db.collection('probe_docs').createIndex({ subject: 'text', message: 'text' });
      return db.collection('probe_docs').find({ $text: { $search: 'report' } }).toArray();
    },
  },
  {
    feature: 'TTL index (session store expiry)',
    pattern: /autoRemove|expireAfterSeconds|expires:/,
    run: (db) => db.collection('probe_writes').createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
  },
  {
    feature: 'counts and distinct',
    pattern: /countDocuments\(|distinct\(/,
    run: async (db) => {
      const c = db.collection('probe_docs');
      await c.countDocuments({ a: { $gt: 0 } });
      await c.estimatedDocumentCount();
      return c.distinct('riskLevel');
    },
  },
];

(async () => {
  if (!uri) throw new Error('No connection string: pass --uri or set MONGOOSE');
  walk(SRC);
  console.log(`Settings: ${describeConnectionSecurity()}`);

  const auth = process.env.MONGO_USER ? { auth: { username: process.env.MONGO_USER, password: process.env.MONGO_PASSWORD } } : {};
  const client = await MongoClient.connect(uri, { ...auth, ...mongoClientOptions(), serverSelectionTimeoutMS: 15000 });
  const db = client.db(scratchDb);
  const info = await db.admin().command({ buildInfo: 1 });
  console.log(`Target reports version ${info.version}; scratch database ${scratchDb}\n`);

  let failed = 0;
  try {
    await db.collection('probe_docs').insertMany(docs() as any[]);
    await db.collection('probe_join').insertMany([{ _id: 10, firstName: 'Ada' }, { _id: 11, firstName: 'Grace' }] as any[]);

    for (const probe of probes) {
      try {
        await probe.run(db);
        console.log(`ok    ${probe.feature}`);
      } catch (error) {
        failed += 1;
        const files = usedIn(probe.pattern);
        console.log(`FAIL  ${probe.feature}\n      ${(error as Error).message.split('\n')[0]}`);
        console.log(`      used in ${files.length} file(s)${files.length ? ':\n        ' + files.join('\n        ') : ''}`);
      }
    }

    const unprobed: Array<[string, RegExp]> = [
      ['change streams', /\.watch\(\s*\[|changeStream/i],
      ['transactions', /startSession\(|withTransaction\(|startTransaction\(/],
    ];
    for (const [feature, pattern] of unprobed) {
      const files = usedIn(pattern).filter((file) => !/chokidar|fs\.watch/.test(fs.readFileSync(path.join(SRC, file), 'utf8')));
      if (files.length) console.log(`\nNOTE  ${feature} are now used and not probed:\n        ${files.join('\n        ')}`);
    }
  } finally {
    if (!keep) await db.dropDatabase().catch((error) => console.log(`(could not drop ${scratchDb}: ${error.message})`));
    await client.close();
  }

  console.log(`\n${probes.length - failed}/${probes.length} features supported`);
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
