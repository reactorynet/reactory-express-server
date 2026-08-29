#!/bin/bash
#
# DEPRECATED — this is a thin compatibility shim for `bin/reactory`.
#
# `bin/reactory` is the single supported CLI entry point (it is also the package's
# npm `bin` entry). It accepts every flag this script ever did — --cname=, --cenv=,
# --watch, --debug, --verbose/-v — and adds what this script lacked:
#
#   * runs from ANY working directory (this script used relative paths and failed
#     anywhere but the project root)
#   * REACTORY_CONFIG_NAME / REACTORY_CONFIG_ENV environment defaults
#   * a working --debug (the one here set NODE_DEBUG_OPTIONS and never used it)
#   * `help` / usage text and friendly command aliases (service-gen, module-gen, …)
#   * reliable exit-code propagation
#
# Kept because `bin/build.bin.rsync` has historically shipped cli.sh into the built
# image, so deployed containers and any operator muscle memory keep working. Slated
# for removal in a future release — migrate callers to `bin/reactory`.
#
# Set REACTORY_SUPPRESS_DEPRECATION=1 to silence the notice in scripts.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REACTORY_BIN="$SCRIPT_DIR/reactory"

if [ ! -x "$REACTORY_BIN" ]; then
  echo "Error: $REACTORY_BIN not found or not executable." >&2
  echo "bin/cli.sh is now a shim for bin/reactory; ensure it is present and executable." >&2
  exit 1
fi

if [ -z "$REACTORY_SUPPRESS_DEPRECATION" ]; then
  # stderr, never stdout — callers pipe and parse stdout.
  echo "warning: bin/cli.sh is deprecated; use 'bin/reactory' instead (forwarding)." >&2
fi

# "$@" preserves argument boundaries exactly, so payloads containing spaces
# (e.g. --input='{"id": 1}') survive the hand-off. exec replaces this process so the
# child's exit code becomes ours with no extra propagation logic.
exec "$REACTORY_BIN" "$@"
