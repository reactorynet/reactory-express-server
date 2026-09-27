import crypto from 'crypto';
import Reactory from '@reactorynet/reactory-core';
import ReactoryClient from '../../models/ReactoryClient';
import PasswordHasher from '@reactory/server-core/authentication/password/PasswordHasher';
import logger from '@reactory/server-core/logging';

export interface ServiceKeyCliArgs {
  command: 'mint' | 'list' | 'disable';
  clientKey: string;
  label?: string;
  keyId?: string;
}

export async function mintServiceKey(clientKey: string, label: string): Promise<{ id: string; rawKey: string; label: string }> {
  if (!clientKey) throw new Error('Client key is required');
  if (!label) throw new Error('Label is required');

  const client: any = await ReactoryClient.findOne({ key: clientKey }).exec();
  if (!client) throw new Error(`Client with key "${clientKey}" not found`);

  const rawKey = `sk_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = await PasswordHasher.hash(rawKey);

  if (!Array.isArray(client.serviceKeys)) {
    client.serviceKeys = [];
  }

  const newEntry = {
    label,
    keyHash,
    createdAt: new Date(),
    disabled: false,
  };

  client.serviceKeys.push(newEntry);
  if (typeof client.markModified === 'function') {
    client.markModified('serviceKeys');
  }
  await client.save();

  const created = client.serviceKeys[client.serviceKeys.length - 1];
  return {
    id: created._id ? created._id.toString() : '',
    rawKey,
    label,
  };
}

export async function listServiceKeys(clientKey: string): Promise<any[]> {
  if (!clientKey) throw new Error('Client key is required');

  const client: any = await ReactoryClient.findOne({ key: clientKey }).exec();
  if (!client) throw new Error(`Client with key "${clientKey}" not found`);

  return (client.serviceKeys || []).map((sk: any) => ({
    id: sk._id ? sk._id.toString() : '',
    label: sk.label,
    createdAt: sk.createdAt,
    lastUsedAt: sk.lastUsedAt,
    disabled: !!sk.disabled,
  }));
}

export async function disableServiceKey(clientKey: string, keyIdOrLabel: string): Promise<boolean> {
  if (!clientKey) throw new Error('Client key is required');
  if (!keyIdOrLabel) throw new Error('Key ID or label is required');

  const client: any = await ReactoryClient.findOne({ key: clientKey }).exec();
  if (!client) throw new Error(`Client with key "${clientKey}" not found`);

  if (!Array.isArray(client.serviceKeys) || client.serviceKeys.length === 0) {
    throw new Error(`No service keys found for client "${clientKey}"`);
  }

  const match = client.serviceKeys.find((sk: any) =>
    (sk._id && sk._id.toString() === keyIdOrLabel) || sk.label === keyIdOrLabel
  );

  if (!match) {
    throw new Error(`Service key "${keyIdOrLabel}" not found on client "${clientKey}"`);
  }

  match.disabled = true;
  if (typeof client.markModified === 'function') {
    client.markModified('serviceKeys');
  }
  await client.save();
  return true;
}

const HelpText = `
Service Keys CLI manages per-service API keys for Reactory tenants.

Commands:
  mint -c <clientKey> -l <label>       Mint a new service key for a tenant
  list -c <clientKey>                  List all service keys for a tenant
  disable -c <clientKey> -i <keyId>    Disable a service key
`;

const ServiceKeysCliApp = async (args: any, context: Reactory.Server.IReactoryContext) => {
  const command = args._ ? args._[0] : args.command;
  const clientKey = args.c || args.clientKey || args.client;
  const label = args.l || args.label;
  const keyId = args.i || args.keyId || args.id;

  switch (command) {
    case 'mint': {
      const result = await mintServiceKey(clientKey, label);
      logger.info(`Service key minted successfully:`);
      logger.info(`  Client:   ${clientKey}`);
      logger.info(`  Label:    ${result.label}`);
      logger.info(`  ID:       ${result.id}`);
      logger.info(`  Key:      ${result.rawKey}`);
      logger.info(`IMPORTANT: Store this key securely. It will NOT be displayed again.`);
      return result;
    }
    case 'list': {
      const keys = await listServiceKeys(clientKey);
      logger.info(`Service keys for client "${clientKey}":`);
      for (const k of keys) {
        logger.info(`  ID: ${k.id} | Label: ${k.label} | Disabled: ${k.disabled} | Created: ${k.createdAt} | LastUsed: ${k.lastUsedAt || 'never'}`);
      }
      return keys;
    }
    case 'disable': {
      await disableServiceKey(clientKey, keyId);
      logger.info(`Service key "${keyId}" disabled for client "${clientKey}".`);
      return { success: true };
    }
    default:
      logger.info(HelpText);
      return null;
  }
};

export const ServiceKeysCliDefinition: any = {
  nameSpace: 'core',
  name: 'ServiceKeys',
  version: '1.0.0',
  description: HelpText,
  component: ServiceKeysCliApp,
  domain: Reactory.ComponentDomain.plugin,
  features: [
    {
      feature: 'ServiceKeys',
      featureType: Reactory.FeatureType.function,
      action: ['mint', 'list', 'disable'],
      stem: 'service-keys',
    },
  ],
  overwrite: false,
  roles: ['SYSTEM', 'ADMIN'],
  stem: 'service-keys',
  tags: ['service-keys', 'api-keys', 'security', 'auth', 'cli'],
  toString(includeVersion?: boolean) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
};

export default ServiceKeysCliDefinition;
