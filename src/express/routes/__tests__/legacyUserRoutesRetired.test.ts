/**
 * REACTORY-302016408/20261103/1998880703 (E6) - the duplicated `/user` router.
 *
 * `src/useraccount/index.ts` used to be mounted at `/user` while its `Admin`
 * import was commented out, so `POST /user/register` and `POST /user/forgot`
 * threw `ReferenceError: Admin is not defined` behind a route that looked
 * live. The one real implementation lives in
 * `modules/reactory-core/routes/useraccount/UserAccount.ts`, mounted at
 * `/useraccount`.
 *
 * These assertions are behavioural on purpose. Deleting an import proves
 * nothing - a module can be present, exported and never mounted. What proves
 * the retirement is that the *same* app that answers the live route answers
 * 404 for the retired one. Before this ticket the suite below fails twice:
 * `OPTIONS /user/register` returned 203 (the deleted router's own pre-flight
 * handler) and `POST /user/forgot` returned 500 from the ReferenceError.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

import ConfigureRoutes from '../index';
import UserAccountRouter from '@reactory/server-modules/reactory-core/routes/useraccount/UserAccount';

/**
 * The production app composed by `ConfigureRoutes`, plus the router that the
 * reactory-core module route map mounts at `/useraccount`.
 *
 * The module route map is empty under jest (`src/modules/__index.ts` is
 * generated at server start-up), so the live router is mounted here directly.
 * That is deliberate: it is the positive control that proves this harness
 * really serves mounted routers, which is what gives the 404s below their
 * meaning.
 */
const buildApp = () => {
  const app = express();
  app.use(express.json());
  ConfigureRoutes(app);
  app.use('/useraccount', UserAccountRouter);
  return app;
};

/** The `src` directory - this file lives at src/express/routes/__tests__. */
const SRC_ROOT = path.resolve(__dirname, '..', '..', '..');

/** Every .ts file under src, excluding the test tree itself. */
const sourceFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      sourceFiles(full, found);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
};

describe('legacy /user registration routes are retired', () => {
  const app = buildApp();

  describe('the live mount still answers (harness sanity check)', () => {
    it('OPTIONS /useraccount/register returns the 203 pre-flight acknowledgement', async () => {
      const response = await request(app).options('/useraccount/register');
      expect(response.status).toBe(203);
    });
  });

  describe('/register is gone from the /user prefix', () => {
    it('OPTIONS /user/register is 404, not 203', async () => {
      // The deleted router answered this itself with 203, so a 203 here means
      // the broken router is back on the mount.
      const response = await request(app).options('/user/register');
      expect(response.status).toBe(404);
    });

    it('POST /user/register is 404, not a ReferenceError behind a 500', async () => {
      const response = await request(app)
        .post('/user/register')
        .send({ user: { firstName: 'Test', lastName: 'User', email: 'retired@example.com' }, organization: { name: 'Retired Co' } });
      expect(response.status).toBe(404);
    });
  });

  describe('/forgot is gone from the /user prefix', () => {
    it('POST /user/forgot is 404', async () => {
      const response = await request(app)
        .post('/user/forgot')
        .send({ email: 'retired@example.com' });
      expect(response.status).toBe(404);
    });
  });

  describe('the retired implementation is not merely unmounted', () => {
    it('src/useraccount no longer exists', () => {
      expect(fs.existsSync(path.join(SRC_ROOT, 'useraccount'))).toBe(false);
    });

    it('no source file imports @reactory/server-core/useraccount', () => {
      const offenders = sourceFiles(path.join(SRC_ROOT))
        .filter((file) => fs.readFileSync(file, 'utf8').includes('server-core/useraccount'))
        .map((file) => path.relative(SRC_ROOT, file));
      expect(offenders).toEqual([]);
    });

    it('no source file mounts a /user route table entry', () => {
      const configureRoutes = fs.readFileSync(path.join(SRC_ROOT, 'express', 'routes', 'index.ts'), 'utf8');
      expect(configureRoutes).not.toMatch(/['"]\/user['"]\s*:/);
    });
  });
});
