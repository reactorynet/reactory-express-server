#!/usr/bin/env node
/**
 * Locale parity check for the Reactory i18n bundles.
 *
 * Each locale is a folder under `i18n/` (`af/`, `en/`, `en-US/`, ...) holding one
 * JSON file per namespace. Two things have to hold for a user not to see a raw
 * key or an unexpected fallback:
 *
 *   1. **coverage** — every namespace a locale declares should exist in the
 *      locales that share it; and
 *   2. **key alignment** — within a namespace, a locale must not be missing keys
 *      the reference locale has, and must not carry keys the reference does not
 *      know about (those are almost always strings copied from another product).
 *
 * `en` is the reference because it is the language the source strings are
 * authored in and the fallback every other locale resolves against.
 *
 * Usage:
 *   node bin/scripts/i18n-check-parity.mjs [i18n-dir] [--reference en]
 *                                          [--json] [--fill-english]
 *
 *   bin/scripts/i18n-check-parity.sh    # same, defaulting the dir from the env
 *
 * `i18n-dir` defaults to `$APP_DATA_ROOT/i18n`, then `$REACTORY_DATA/i18n`, then
 * `./i18n`.
 *
 * Exit: 0 = aligned, 1 = drift found (or nothing to scan) — details on stdout.
 *
 * NOTE: missing keys are *not* auto-fillable for a non-English locale; they need
 * a translator. Missing keys in another *English* locale can be filled from the
 * reference (`--fill-english`), since the text is the same language and no
 * existing value is touched.
 */
import {
  readdirSync, readFileSync, writeFileSync, statSync
} from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const fillEnglish = args.includes('--fill-english');
const refIndex = args.indexOf('--reference');
const reference = refIndex >= 0 && args[refIndex + 1] ? args[refIndex + 1] : 'en';
const rootIndex = args.indexOf('--i18n-root');

// Flag values must not be mistaken for the positional directory.
const flagValues = new Set();
if (refIndex >= 0 && args[refIndex + 1]) flagValues.add(args[refIndex + 1]);
if (rootIndex >= 0 && args[rootIndex + 1]) flagValues.add(args[rootIndex + 1]);
const positional = args.find((a) => !a.startsWith('--') && !flagValues.has(a));

const dataRoot = process.env.APP_DATA_ROOT || process.env.REACTORY_DATA;
const defaultRoot = dataRoot ? join(dataRoot, 'i18n') : join(process.cwd(), 'i18n');
const i18nRoot = resolve(
  rootIndex >= 0 && args[rootIndex + 1] ? args[rootIndex + 1] : positional || defaultRoot,
);

const isDirectory = (entry) => statSync(join(i18nRoot, entry)).isDirectory();
const locales = readdirSync(i18nRoot).filter(isDirectory);

// A scan that finds nothing must FAIL, not report success: an empty locale list
// would otherwise pass every alignment check vacuously.
if (locales.length < 2) {
  console.error(`No locale folders found under ${i18nRoot} (found: ${locales.length}).`);
  console.error('Pass the i18n directory: node bin/scripts/i18n-check-parity.mjs <i18n-dir>');
  process.exit(1);
}

const read = (locale, ns) => JSON.parse(readFileSync(join(i18nRoot, locale, ns), 'utf8'));
const namespacesOf = (locale) => readdirSync(join(i18nRoot, locale))
  .filter((file) => file.endsWith('.json'))
  .sort();

const namespaces = [...new Set(locales.flatMap(namespacesOf))].sort();

/** True for locales whose content is the same language as the reference. */
const isEnglish = (locale) => locale.split(/[-_]/)[0] === reference.split(/[-_]/)[0];

const report = {
  reference, i18nRoot, locales, coverage: [], alignment: [], untranslated: [], filled: [],
  // Keys that interpolate a count must carry plural forms, otherwise English
  // renders "1 tool calls" for a single item. Checked per locale because a
  // language can need more forms than English (`_few`/`_many`).
  plurals: [],
};

/**
 * A key "bears a count" when its text interpolates `{{count}}`.
 *
 * `{{count}}` specifically, not any interpolation: i18next selects a plural
 * suffix from the `count` option only. A `{{selected.length}}` reference cannot
 * drive pluralisation and is therefore handled by the count-bearing key
 * itself (see `report.countInterpolations` below).
 */
const COUNT_PATTERN = /\{\{\s*count\s*\}\}/;

/** Plural suffixes i18next may select for a language. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const pluralRoots = (bundle) => {
  const roots = new Set();
  Object.keys(bundle).forEach((key) => {
    if (PLURAL_SUFFIX.test(key)) roots.add(key.replace(PLURAL_SUFFIX, ''));
  });
  return roots;
};

/**
 * Keys that interpolate an array length instead of `count`.
 *
 * These cannot be pluralised by i18next as written, so they are reported
 * separately: they need a `count` option at the call site before plural forms
 * can be added. Surfacing them keeps the gap visible instead of silently
 * "passing" the plural check.
 */
const LENGTH_PATTERN = /\{\{\s*[\w$.]+\.length\s*\}\}/;
report.countInterpolations = [];

namespaces.forEach((ns) => {
  const present = locales.filter((locale) => namespacesOf(locale).includes(ns));

  if (present.length < 2) {
    report.coverage.push({
      namespace: ns,
      present,
      missing: locales.filter((locale) => !present.includes(locale)),
    });
    return;
  }

  // Present in more than one locale, so not a coverage defect — but a locale may
  // still have no file for it at all, in which case that locale silently falls
  // back to the reference language for every key in the namespace. Reported
  // explicitly so a "coverage: complete" line cannot hide it. Informational: it
  // does not fail the check, because translating a namespace is a choice.
  if (present.includes(reference)) {
    locales
      .filter((locale) => locale !== reference && !present.includes(locale))
      .forEach((locale) => report.untranslated.push({ namespace: ns, locale }));
  }

  if (!present.includes(reference)) return;

  const refBundle = read(reference, ns);
  const refKeys = Object.keys(refBundle);

  // Plural audit for every locale that carries this namespace (including the
  // reference): a count-bearing key must resolve to a plural pair.
  present.forEach((locale) => {
    const bundle = read(locale, ns);
    const roots = pluralRoots(bundle);

    // A partial pair (`_one` present, `_other` absent) leaves no base key, so
    // the plural roots have to be audited too — otherwise a bundle could look
    // "pluralised" while still rendering a raw key for a plural count.
    const audited = Object.keys(bundle).filter((key) => !PLURAL_SUFFIX.test(key));
    roots.forEach((root) => {
      if (audited.indexOf(root) < 0) audited.push(root);
    });

    audited.forEach((key) => {
      const value = bundle[key];

      if (typeof value === 'string' && LENGTH_PATTERN.test(value)) {
        report.countInterpolations.push({ namespace: ns, locale, key, reason: 'interpolates an array length; needs a count option' });
        return;
      }

      const needsPlural = (typeof value === 'string' && COUNT_PATTERN.test(value)) || roots.has(key);
      if (!needsPlural) return;

      const hasOne = Object.prototype.hasOwnProperty.call(bundle, `${key}_one`);
      const hasOther = Object.prototype.hasOwnProperty.call(bundle, `${key}_other`);
      // English (and the reference generally) needs `_one` + `_other`; a
      // language with more forms still has to supply those two at minimum.
      if (!hasOne || !hasOther) {
        report.plurals.push({
          namespace: ns,
          locale,
          key,
          missing: [
            ...(hasOne ? [] : ['_one']),
            ...(hasOther ? [] : ['_other']),
          ],
        });
      }
    });
  });

  present
    .filter((locale) => locale !== reference)
    .forEach((locale) => {
      const bundle = read(locale, ns);
      const keys = Object.keys(bundle);
      const keySet = new Set(keys);
      const missing = refKeys.filter((key) => !keySet.has(key));
      const stray = keys.filter((key) => !refKeys.includes(key));

      if (fillEnglish && isEnglish(locale) && stray.length === 0 && missing.length > 0) {
        missing.forEach((key) => {
          bundle[key] = refBundle[key];
        });
        writeFileSync(join(i18nRoot, locale, ns), `${JSON.stringify(bundle, null, 2)}\n`);
        report.filled.push({ namespace: ns, locale, keys: missing });
        return;
      }

      if (missing.length > 0 || stray.length > 0) {
        report.alignment.push({
          namespace: ns,
          locale,
          missing,
          stray,
          // A non-English locale's gaps need a translator; an English locale's
          // can be filled from the reference.
          fillable: isEnglish(locale) && stray.length === 0,
        });
      }
    });
});

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Locale parity (reference: ${reference})`);
  console.log(`  root:    ${i18nRoot}`);
  console.log(`  locales: ${locales.join(', ')}\n`);

  if (report.filled.length > 0) {
    console.log('FILLED from the reference (same language):');
    report.filled.forEach(({ namespace, locale, keys }) => console.log(`  ${locale}/${namespace}: +${keys.length} key(s)`),);
    console.log('');
  }

  console.log('Coverage (namespace declared by some locales but not others):');
  if (report.coverage.length === 0) console.log('  complete');
  report.coverage.forEach(({ namespace, present, missing }) => console.log(`  ${namespace}: present [${present.join(', ')}], missing [${missing.join(', ')}]`),);

  console.log('\nUntranslated namespaces (reference namespace a locale has no file for;');
  console.log('English fallback applies to every key in it):');
  if (report.untranslated.length === 0) console.log('  none');
  report.untranslated.forEach(({ namespace, locale }) => console.log(`  ${locale}: ${namespace}`));

  console.log('\nPlural forms (count-bearing keys must carry _one and _other):');
  if (report.plurals.length === 0) console.log('  complete');
  report.plurals.forEach(({ namespace, locale, key, missing }) => console.log(
    `  ${locale}/${namespace}: ${key} missing [${missing.join(', ')}]`,
  ));

  console.log('\nCount interpolations that cannot be pluralised as written:');
  if (report.countInterpolations.length === 0) console.log('  none');
  report.countInterpolations.forEach(({ namespace, locale, key }) => console.log(`  ${locale}/${namespace}: ${key}`));

  console.log('\nKey alignment:');
  if (report.alignment.length === 0) console.log('  aligned');
  report.alignment.forEach(({
    namespace, locale, missing, stray, fillable
  }) => {
    console.log(
      `  ${locale}/${namespace}: ${missing.length} missing, ${stray.length} stray`
        + `${fillable ? ' (fillable with --fill-english)' : ''}`,
    );
    missing.slice(0, 5).forEach((key) => console.log(`      missing: ${key}`));
    if (missing.length > 5) console.log(`      … +${missing.length - 5} more missing`);
    stray.slice(0, 5).forEach((key) => console.log(`      stray:   ${key}`));
    if (stray.length > 5) console.log(`      … +${stray.length - 5} more stray`);
  });
}

process.exit(
  report.coverage.length > 0
  || report.alignment.length > 0
  || report.plurals.length > 0
  || report.countInterpolations.length > 0
    ? 1
    : 0,
);
