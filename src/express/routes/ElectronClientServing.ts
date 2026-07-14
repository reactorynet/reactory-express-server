import express, { Application } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '@reactory/server-core/logging';

/**
 * Serves the pre-built PWA client as static files from Express when running
 * inside the Electron desktop shell (REACTORY_RUNTIME=electron), so the
 * packaged app doesn't need a separate dev server or file:// protocol.
 *
 * Mirrors reactory-electron/src/main/patches/electron-client-serving.ts —
 * keep the two in sync if either changes.
 */
export const configureElectronClientServing = (app: Application): void => {
  const clientBuildPath = process.env.ELECTRON_CLIENT_BUILD_PATH;
  const isElectron = process.env.REACTORY_RUNTIME === 'electron';

  if (!isElectron || !clientBuildPath) {
    return;
  }

  if (!fs.existsSync(clientBuildPath)) {
    logger.warn(`[Electron] Client build path not found: ${clientBuildPath}. The API will run without a UI.`);
    return;
  }

  logger.info(`[Electron] Serving client from ${clientBuildPath}`);

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(clientBuildPath, {
    maxAge: '1y',         // Long cache for hashed assets
    immutable: true,
    index: false,         // Don't auto-serve index.html for directory requests
  }));

  // SPA fallback: any non-API, non-CDN, non-auth route returns index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/cdn') || req.path.startsWith('/auth')) {
      return next();
    }

    const indexPath = path.join(clientBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
};

export default configureElectronClientServing;
