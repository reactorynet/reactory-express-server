
import fs from 'fs';
import path from 'path';
import { loadEnabledClientConfigsFromYaml } from './helpers/configLoader';
import logger from '@reactory/server-core/logging';

const {
  APPLICATION_ROOT = 'src',
  NODE_ENV = 'development'
} = process.env;

const enabled_clients: Reactory.Server.IReactoryClientConfig[] = [];

// Load legacy TS/JS configurations from generated __index file
const indexFile = path.resolve(process.cwd(), APPLICATION_ROOT, 'data/clientConfigs', `__index.${NODE_ENV === 'development' ? 'ts' : 'js'}`);

if (fs.existsSync(indexFile)) {
  try {
    const clientConfigs = require(indexFile).default || [];
    enabled_clients.push(...clientConfigs);
  } catch (err) {
    logger.warn(`Could not load client configs from ${indexFile}`, err);
  }
}

// Load YAML configurations
try {
  const yamlResults = loadEnabledClientConfigsFromYaml({ 
    applicationRoot: APPLICATION_ROOT 
  });
  
  yamlResults.forEach(result => {
    // Avoid duplicates if a client is defined in both (YAML takes precedence or is additive?)
    // Let's assume we want to add any that aren't already present, or maybe merge?
    // For now, we'll append if key doesn't exist to preserve legacy behavior if they overlap,
    // or maybe we should prefer YAML? The user asked to "load our file configurations".
    
    const existingIndex = enabled_clients.findIndex(c => c.key === result.config.key);
    if (existingIndex >= 0) {
      logger.warn(`Client config '${result.config.key}' loaded from YAML overrides existing configuration.`);
      enabled_clients[existingIndex] = result.config;
    } else {
      enabled_clients.push(result.config);
    }

    if (result.warnings.length > 0) {
      logger.warn(`Warnings loading YAML config for ${result.config.key}:`, result.warnings);
    }
  });
} catch (error) {
  logger.error("Failed to load YAML client configurations", error);
}

export default enabled_clients;