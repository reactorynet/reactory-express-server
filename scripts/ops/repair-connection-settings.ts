/**
 * Repoint the stored `reactory.mongodb.connection` at the database the server
 * actually uses.
 *
 * Run through `bin/repair-connection-settings.sh`; see the header there for the
 * supported flags. Dry run by default: nothing is written without `--apply`.
 *
 *   bin/repair-connection-settings.sh                     # report only
 *   bin/repair-connection-settings.sh --apply             # repair the stale default
 *   bin/repair-connection-settings.sh --apply --force     # overwrite a custom value
 *
 * The target is derived from the deployment environment through
 * `mongoConnectionSettings`, the same function `settings.ts` seeds from, so the
 * repair, the seed and the server's own Mongoose client cannot disagree:
 * `REACTORY_MONGO_*` > the `MONGOOSE` URI (including its `authSource`) >
 * `MONGO_*` > local defaults.
 *
 * Design notes:
 *  - `MONGOOSE` is the connection used to read and write the client document.
 *    It is the only URI the server itself trusts, and it always carries the
 *    credentials in an environment that requires them.
 *  - Only the one setting is touched. `settings.$.data` is replaced wholesale so
 *    the result does not depend on what the document used to contain, and the
 *    surrounding setting (title, componentFqn, roles, settingType) is untouched.
 *  - Safe to re-run: a correct setting is a no-op and the exit code stays 0.
 */
import { MongoClient } from 'mongodb';
// Relative imports only: this runs under plain ts-node (bin/repair-connection-settings.sh),
// where the @reactory/server-core alias is not registered. Same reason
// scripts/ci/check-db-connections.ts imports ../../src/database/connectionOptions.
import {
  mongoClientOptions,
  mongoConnectionSettings,
} from '../../src/database/connectionOptions';
import {
  ConnectionData,
  planConnectionSettingRepair,
  planMutates,
  redactConnectionData,
} from '../../src/database/connectionSettingRepair';

const SETTING_NAME = 'reactory.mongodb.connection';
const CLIENTS_COLLECTION = 'reactory_clients';

interface Options {
  apply: boolean;
  force: boolean;
  keepVariant: boolean;
  json: boolean;
  clientKey: string;
}

const parseArgs = (argv: string[]): Options => {
  const options: Options = {
    apply: false,
    force: false,
    keepVariant: false,
    json: false,
    clientKey: 'reactory',
  };

  argv.forEach((arg) => {
    if (arg === '--apply') options.apply = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--keep-variant') options.keepVariant = true;
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--client=')) options.clientKey = arg.slice('--client='.length);
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unrecognised argument: ${arg}`);
    }
  });

  return options;
};

const printUsage = () => {
  process.stdout.write(
    [
      'Repair the stored reactory.mongodb.connection setting.',
      '',
      'Usage: bin/repair-connection-settings.sh [--apply] [--force] [--keep-variant]',
      '                                        [--json] [--client=<key>]',
      '',
      '  --apply         Write the repair. Without it the tool reports and exits.',
      '  --force         Overwrite a stored value that is not the historical default.',
      '  --keep-variant  Leave the declared variant as-is instead of the canonical spelling.',
      '  --json          Machine-readable output.',
      '  --client=<key>  Client key to repair (default: reactory).',
      '',
    ].join('\n'),
  );
};

interface StoredSetting {
  name?: string;
  settingType?: string;
  variant?: string;
  data?: ConnectionData;
}

const findSetting = (doc: any, name: string): StoredSetting | undefined => {
  if (!Array.isArray(doc?.settings)) return undefined;
  return doc.settings.find((setting: StoredSetting) => setting?.name === name);
};

const main = async (): Promise<number> => {
  const options = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGOOSE;

  if (!uri) {
    process.stderr.write('MONGOOSE is not set; cannot reach the platform database.\n');
    return 1;
  }

  const derived = mongoConnectionSettings(process.env);
  const desired: ConnectionData = {
    host: derived.host,
    port: derived.port,
    username: derived.username,
    password: derived.password,
    database: derived.database,
    ...(derived.options ? { options: derived.options } : {}),
  };

  const client = new MongoClient(uri, mongoClientOptions(process.env));

  try {
    await client.connect();
    const collection = client.db().collection(CLIENTS_COLLECTION);
    const document = await collection.findOne({ key: options.clientKey });

    if (!document) {
      process.stderr.write(`No client document with key '${options.clientKey}'.\n`);
      return 1;
    }

    const setting = findSetting(document, SETTING_NAME);
    const stored: ConnectionData | null = setting?.data
      ? { ...setting.data, variant: setting.data.variant ?? setting.variant }
      : null;

    const plan = planConnectionSettingRepair(
      stored,
      { settingName: SETTING_NAME, desired },
      { force: options.force, keepVariant: options.keepVariant },
    );

    const shouldWrite = planMutates(plan);
    let applied = false;
    let verification: { ok: boolean; detail: string } = { ok: false, detail: 'not attempted' };

    if (!options.apply) {
      verification = { ok: false, detail: 'dry run; no write attempted' };
    } else if (!shouldWrite) {
      verification = { ok: plan.decision === 'already-correct', detail: plan.reason };
    } else {
      // The data subdocument is replaced wholesale; the rest of the setting and
      // the rest of the document are untouched.
      const nextData: ConnectionData = { ...desired };
      const set: Record<string, any> = { 'settings.$.data': nextData };
      if (plan.normalisedVariant) set['settings.$.variant'] = plan.normalisedVariant.to;

      const result = await collection.updateOne(
        { key: options.clientKey, 'settings.name': SETTING_NAME },
        { $set: set },
      );
      applied = result.modifiedCount === 1;

      const after = findSetting(
        await collection.findOne({ key: options.clientKey }),
        SETTING_NAME,
      );
      const afterData: ConnectionData = after?.data ?? {};
      const ok = afterData.database === desired.database
        && Number(afterData.port) === Number(desired.port)
        && afterData.host === desired.host
        && (afterData.username ?? '') === (desired.username ?? '')
        && JSON.stringify(afterData.options ?? {}) === JSON.stringify(desired.options ?? {});

      verification = {
        ok,
        detail: ok
          ? `verified on re-read: database ${redactConnectionData(afterData)?.database}`
          : 'RE-READ DOES NOT MATCH THE TARGET',
      };
    }

    const payload = {
      settingName: SETTING_NAME,
      clientKey: options.clientKey,
      mode: options.apply ? 'apply' : 'dry-run',
      decision: plan.decision,
      changedFields: plan.changedFields,
      normalisedVariant: plan.normalisedVariant ?? null,
      current: plan.current,
      desired: plan.desired,
      reason: plan.reason,
      applied,
      verification,
    };

    const refused = plan.decision === 'refuse-override';
    let exitCode = 0;
    if (options.apply) exitCode = verification.ok ? 0 : 2;
    else if (refused) exitCode = 3;

    if (options.json) {
      process.stdout.write(`${JSON.stringify({ ...payload, exitCode }, null, 2)}\n`);
    } else {
      process.stdout.write(
        [
          '',
          `setting        ${SETTING_NAME} (client: ${options.clientKey})`,
          `mode           ${payload.mode}`,
          `decision       ${plan.decision}`,
          `changed fields ${plan.changedFields.length ? plan.changedFields.join(', ') : 'none'}`,
          plan.normalisedVariant
            ? `variant        ${plan.normalisedVariant.from} -> ${plan.normalisedVariant.to}`
            : '',
          `current        ${JSON.stringify(plan.current)}`,
          `desired        ${JSON.stringify(plan.desired)}`,
          `applied        ${applied}`,
          `verification   ${verification.ok ? 'ok' : 'not ok'} - ${verification.detail}`,
          '',
        ].filter(Boolean).join('\n'),
      );
    }

    return exitCode;
  } finally {
    await client.close().catch(() => undefined);
  }
};

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exit(1);
  });
