#!/bin/bash
# Locale parity check for the i18n bundles (see bin/scripts/i18n-check-parity.mjs).
#
# Compares every locale folder under the i18n root against the reference locale
# (`en`) and reports namespaces a locale is missing, keys a locale is missing
# that the reference has, and keys it carries that the reference does not.
# Exits non-zero on any drift — including when no locales are found at all, so a
# mis-pointed run fails loudly instead of reporting success.
#
#   bin/scripts/i18n-check-parity.sh [i18n-dir] [--reference en] [--json] [--fill-english]
#
# With no directory argument the i18n root is taken from $APP_DATA_ROOT, then
# $REACTORY_DATA, then ../reactory-data relative to this repository.
#
# --fill-english closes gaps in another *English* locale from the reference. It
# never invents a translation, so it is safe for en/en-US only.
set -u
cd "$(dirname "$0")/../.."

# A leading non-flag argument is the i18n directory; otherwise default it.
if [ "$#" -gt 0 ] && [ "${1#--}" = "$1" ]; then
  exec node bin/scripts/i18n-check-parity.mjs "$@"
fi

DATA_ROOT="${APP_DATA_ROOT:-${REACTORY_DATA:-$PWD/../reactory-data}}"
exec node bin/scripts/i18n-check-parity.mjs "${DATA_ROOT}/i18n" "$@"
