import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';

export interface ClientConfigLoaderOptions {
	/**
	 * Root folder where clientConfigs live. Defaults to <APPLICATION_ROOT>/data/clientConfigs
	 */
	clientConfigsDir?: string;
	/**
	 * APPLICATION_ROOT override (used only if clientConfigsDir is not provided)
	 */
	applicationRoot?: string;
	/**
	 * Optional enabled clients file name. Defaults to enabled-clients.reactory.json
	 */
	enabledClientsFile?: string;
	/**
	 * Environment variables source for interpolation
	 */
	env?: NodeJS.ProcessEnv;
	/**
	 * When true, missing YAML files will be ignored and logged as warnings
	 */
	allowMissing?: boolean;
}

export interface ClientYamlLoadResult {
	config: Reactory.Server.IReactoryClientConfig;
	sources: string[];
	warnings: string[];
}

const DEFAULT_ENABLED_CLIENTS_FILE = 'enabled-clients.reactory.json';

const getClientConfigsDir = (options?: ClientConfigLoaderOptions) => {
	if (options?.clientConfigsDir) return options.clientConfigsDir;
	const applicationRoot = options?.applicationRoot || process.env.APPLICATION_ROOT || 'src';
	return path.resolve(applicationRoot, 'data/clientConfigs');
};

const toArray = (value?: string | string[]) => {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
};

const loadYamlFile = (filePath: string) => {
	const content = fs.readFileSync(filePath, 'utf8');
	return yaml.load(content);
};

const interpolateEnv = (
	value: unknown,
	env: NodeJS.ProcessEnv,
	warnings: string[],
): unknown => {
	if (typeof value === 'string') {
		return value.replace(/\$\{([A-Z0-9_]+)(?::([^}]*))?\}/gi, (match, name, fallback) => {
			const envValue = env[name];
			if (envValue === undefined || envValue === null || envValue === '') {
				if (fallback !== undefined) return fallback;
				warnings.push(`Missing environment variable: ${name}`);
				return '';
			}
			return envValue;
		});
	}

	if (Array.isArray(value)) {
		return value.map((entry) => interpolateEnv(entry, env, warnings));
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, val]) => [
				key,
				interpolateEnv(val, env, warnings),
			]),
		);
	}

	return value;
};

const findYaml = (baseDir: string, candidates: string[]) => {
	for (const candidate of candidates) {
		const fullPath = path.resolve(baseDir, candidate);
		if (fs.existsSync(fullPath)) return fullPath;
	}
	return null;
};

const loadYamlIfExists = (
	baseDir: string,
	candidates: string[],
	env: NodeJS.ProcessEnv,
	warnings: string[],
): unknown | null => {
	const found = findYaml(baseDir, candidates);
	if (!found) return null;
	const parsed = loadYamlFile(found);
	return interpolateEnv(parsed, env, warnings);
};

const mergeElement = (
	config: Record<string, unknown>,
	field: string,
	value: unknown | null,
): Record<string, unknown> => {
	if (value === null || value === undefined) return config;
	return {
		...config,
		[field]: value,
	};
};

export const loadClientConfigFromYaml = (
	clientKey: string,
	options?: ClientConfigLoaderOptions,
): ClientYamlLoadResult | null => {
	const warnings: string[] = [];
	const sources: string[] = [];
	const env = options?.env || process.env;
	const clientConfigsDir = getClientConfigsDir(options);
	const clientDir = path.resolve(clientConfigsDir, clientKey);

	if (!fs.existsSync(clientDir)) {
		const message = `Client config folder not found: ${clientDir}`;
		if (options?.allowMissing) {
			logger.warn(message);
			return null;
		}
		throw new Error(message);
	}

	const baseYaml = findYaml(clientDir, ['config.yaml', 'config.yml', 'index.yaml', 'index.yml']);
	if (!baseYaml) {
		const message = `Client base YAML not found for ${clientKey} in ${clientDir}`;
		if (options?.allowMissing) {
			logger.warn(message);
			return null;
		}
		throw new Error(message);
	}

	const baseConfigRaw = loadYamlFile(baseYaml) as Record<string, unknown>;
	const baseConfig = interpolateEnv(baseConfigRaw, env, warnings) as Record<string, unknown>;
	sources.push(baseYaml);

	const elementFiles: Record<string, string[]> = {
		applicationRoles: ['authentication/roles.yaml', 'authentication/roles.yml', 'roles.yaml', 'roles.yml'],
		users: ['authentication/users.yaml', 'authentication/users.yml', 'users.yaml', 'users.yml'],
		menus: ['menus.yaml', 'menus.yml', 'menus/index.yaml', 'menus/index.yml'],
		routes: ['routes.yaml', 'routes.yml', 'routes/index.yaml', 'routes/index.yml'],
		settings: ['settings.yaml', 'settings.yml', 'settings/index.yaml', 'settings/index.yml'],
		themes: ['themes.yaml', 'themes.yml', 'themes/index.yaml', 'themes/index.yml'],
		whitelist: ['whitelist.yaml', 'whitelist.yml'],
		auth_config: ['authentication/auth-config.yaml', 'authentication/auth-config.yml', 'auth-config.yaml', 'auth-config.yml'],
		plugins: ['plugins.yaml', 'plugins.yml', 'plugins/index.yaml', 'plugins/index.yml'],
		components: ['components.yaml', 'components.yml', 'components/index.yaml', 'components/index.yml'],
		forms: ['forms.yaml', 'forms.yml', 'forms/index.yaml', 'forms/index.yml'],
		modules: ['modules.yaml', 'modules.yml', 'modules/index.yaml', 'modules/index.yml'],
		featureFlags: ['feature-flags.yaml', 'feature-flags.yml', 'featureFlags.yaml', 'featureFlags.yml'],
	};

	let mergedConfig: Record<string, unknown> = { ...baseConfig };

	Object.entries(elementFiles).forEach(([field, candidates]) => {
		const value = loadYamlIfExists(clientDir, candidates, env, warnings);
		if (value !== null) {
			const found = findYaml(clientDir, candidates);
			if (found) sources.push(found);
		}
		mergedConfig = mergeElement(mergedConfig, field, value);
	});

	if (!mergedConfig.key) mergedConfig.key = clientKey;

	return {
		config: mergedConfig as Reactory.Server.IReactoryClientConfig,
		sources,
		warnings,
	};
};

export const loadEnabledClientConfigsFromYaml = (
	options?: ClientConfigLoaderOptions,
): ClientYamlLoadResult[] => {
	const clientConfigsDir = getClientConfigsDir(options);
	const enabledFileName = options?.enabledClientsFile || DEFAULT_ENABLED_CLIENTS_FILE;
	const enabledFilePath = path.resolve(clientConfigsDir, enabledFileName);

	if (!fs.existsSync(enabledFilePath)) {
		throw new Error(`Enabled clients file not found: ${enabledFilePath}`);
	}

	const enabledClients = JSON.parse(fs.readFileSync(enabledFilePath, 'utf8')) as string[];
	return toArray(enabledClients).flatMap((clientKey) => {
		const result = loadClientConfigFromYaml(clientKey, { ...options, allowMissing: true });
		if (!result) return [];
		return [result];
	});
};

export default loadClientConfigFromYaml;
