/**
 * REACTORY-302016408/20261103/1998880703 (E6) - the legacy email senders.
 *
 * `src/emails/index.ts` carried a second, parallel transactional email
 * implementation (`sendActivationEmail`, `sendForgotPasswordEmail`,
 * `installDefaultEmailTemplates`) with zero call sites. It sent through
 * `@sendgrid/mail` directly, bypassing `CommunicatorService` - so reviving any
 * of them would have silently created a second send path that skips provider
 * selection, audit, delivery receipts and error mapping, and would have
 * rebuilt the reset / activation links inline instead of using the normalised
 * helpers in `routes/useraccount/UserAccount.ts`.
 *
 * The senders are deleted. These tests fail if they come back, and they also
 * pin the one thing that must NOT be deleted with them: the `$ref://` EJS
 * bodies under `src/emails/defaults/**`, which the communicator's default
 * template seeding resolves by path.
 */
import fs from 'fs';
import path from 'path';

import * as legacyEmails from '../index';

/** The `src` directory - this file lives at src/emails/__tests__. */
const SRC_ROOT = path.resolve(__dirname, '..', '..');
const EMAILS_INDEX = path.join(SRC_ROOT, 'emails', 'index.ts');

const source = fs.readFileSync(EMAILS_INDEX, 'utf8');

describe('legacy transactional senders are retired from src/emails', () => {
  describe('they are no longer exported', () => {
    it('the default export does not carry the SendGrid senders', () => {
      const defaultExport = (legacyEmails as any).default;
      expect(defaultExport).toBeDefined();
      expect(defaultExport.sendActivationEmail).toBeUndefined();
      expect(defaultExport.sendForgotPasswordEmail).toBeUndefined();
      expect(defaultExport.installDefaultEmailTemplates).toBeUndefined();
    });

    it('installDefaultEmailTemplates is not a named export either', () => {
      expect((legacyEmails as any).installDefaultEmailTemplates).toBeUndefined();
    });

    it('the default export still carries the unrelated survey/organigram surface', () => {
      // Guards against deleting the wrong block: these are a different concern
      // and were left in place.
      const defaultExport = (legacyEmails as any).default;
      expect(typeof defaultExport.queueSurveyEmails).toBe('function');
      expect(defaultExport.surveyEmails).toBeDefined();
      expect(defaultExport.organigramEmails).toBeDefined();
    });
  });

  describe('they are no longer defined', () => {
    it.each([
      'const sendActivationEmail',
      'const sendForgotPasswordEmail',
      'export const installDefaultEmailTemplates',
      'const installTemplateGenerator',
    ])('no %s definition remains', (needle) => {
      expect(source).not.toContain(needle);
    });
  });

  describe('the reference implementation and the shipped bodies are preserved', () => {
    it('loadEmailTemplate (the fallback-chain reference) is still present', () => {
      // Not exported and no longer reached by a sender, but deliberately kept:
      // it is the reference implementation of the scope fallback chain that
      // `TemplateService.resolveTemplate` now owns in the communicator module.
      expect(source).toContain('const loadEmailTemplate');
    });

    it.each([
      'defaults/activation/activation-email-body-html.ejs',
      'defaults/activation/activation-email-body-html.1.ejs',
      'defaults/forgot/forgot-password-body-html.ejs',
    ])('src/emails/%s still exists and is non-empty', (relativePath) => {
      const fullPath = path.join(SRC_ROOT, 'emails', relativePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.readFileSync(fullPath, 'utf8').trim().length).toBeGreaterThan(0);
    });
  });
});
