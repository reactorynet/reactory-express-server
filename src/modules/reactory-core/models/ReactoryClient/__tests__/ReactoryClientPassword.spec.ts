import mongoose from 'mongoose';
import ReactoryClientModel from '../index';
import { loadClientConfigFromYaml } from '../../../../../data/clientConfigs/helpers/configLoader';

describe('ReactoryClient Password, Routes, and Menus Upsert Processing', () => {
  describe('ReactoryClient Methods', () => {
    it('should set salt and hashed password when setPassword is called', () => {
      const client = new ReactoryClientModel({
        key: 'test-solar-compute',
        name: 'Test Solar Compute Planner',
      });

      expect(client.password).toBeUndefined();
      expect(client.salt).toBeUndefined();

      client.setPassword('computeplanner');

      expect(client.salt).toBeDefined();
      expect(typeof client.salt).toBe('string');
      expect(client.salt.length).toBe(32);

      expect(client.password).toBeDefined();
      expect(typeof client.password).toBe('string');
      expect(client.password.length).toBe(128);

      expect(client.validatePassword('computeplanner')).toBe(true);
      expect(client.validatePassword('wrongpassword')).toBe(false);
    });

    it('should support updating password and salt for existing document', () => {
      const client = new ReactoryClientModel({
        key: 'test-solar-compute',
        name: 'Test Solar Compute Planner',
      });

      client.setPassword('initialpass');
      expect(client.validatePassword('initialpass')).toBe(true);

      client.setPassword('updatedpass');
      expect(client.validatePassword('updatedpass')).toBe(true);
      expect(client.validatePassword('initialpass')).toBe(false);
    });
  });

  describe('Solar Compute Planner YAML Config Loading & Upserting', () => {
    it('should load solar-compute-planner config.yaml without YAML errors', () => {
      const result = loadClientConfigFromYaml('solar-compute-planner');
      expect(result).toBeDefined();
      expect(result?.config).toBeDefined();
      expect(result?.config.key).toBe('solar-compute-planner');
      expect(result?.config.password).toBeDefined();
      expect(typeof result?.config.password).toBe('string');
      expect(result?.config.salt).toBe('generate');
      expect(result?.config.routes).toBeDefined();
      expect(Array.isArray(result?.config.routes)).toBe(true);
      expect(result?.config.menus).toBeDefined();
      expect(Array.isArray(result?.config.menus)).toBe(true);
    });

    it('should process solar-compute-planner password, routes, and menus when applied to ReactoryClient model', () => {
      const result = loadClientConfigFromYaml('solar-compute-planner');
      expect(result).toBeDefined();

      const config = result!.config;
      const client = new ReactoryClientModel({
        key: config.key,
        name: config.name,
        username: config.username,
        email: config.email,
        siteUrl: config.siteUrl,
        routes: config.routes as any,
      });

      if (config.password && config.password !== 'generate') {
        client.setPassword(config.password);
      }

      // Mark routes and menus as modified
      client.markModified('routes');
      client.markModified('menus');

      expect(client.salt).toBeDefined();
      expect(client.password).toBeDefined();
      expect(client.validatePassword(config.password!)).toBe(true);
      expect(client.isModified('routes')).toBe(true);
      expect(client.isModified('menus')).toBe(true);
    });
  });
});
