#!/bin/bash
# ==============================================================================
# sync-data.sh — Synchronize reactory-data (themes & plugins) to Kubernetes
#
# Usage:
#   sh bin/sync-data.sh [namespace] [kubeconfig] [scope: all|plugins|themes]
#
# Default namespace:  reactory
# Default kubeconfig: ~/.kube/reactory-small.yaml
# Default scope:      all
# ==============================================================================
set -e

NAMESPACE=${1:-reactory}
KUBECONFIG=${2:-${KUBECONFIG:-$HOME/.kube/reactory-small.yaml}}
KUBECONFIG="${KUBECONFIG/#\~/$HOME}"
SCOPE=${3:-all}
APP_LABEL="app=reactory-express-server"

echo "🔍 Locating reactory-express-server pod in namespace '${NAMESPACE}'..."
POD_NAME=$(KUBECONFIG="$KUBECONFIG" kubectl get pods -n "$NAMESPACE" -l "$APP_LABEL" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$POD_NAME" ]; then
  echo "❌ Error: No running pod found matching label '${APP_LABEL}' in namespace '${NAMESPACE}'"
  exit 1
fi

echo "📦 Found target pod: ${POD_NAME}"

SOURCE_DATA="/Users/wernerw/Projects/reactory/reactory-data"
if [ ! -d "$SOURCE_DATA" ] && [ -n "$REACTORY_DATA" ]; then
  SOURCE_DATA="$REACTORY_DATA"
fi

if [ ! -d "$SOURCE_DATA" ]; then
  echo "❌ Error: reactory-data directory not found at $SOURCE_DATA"
  exit 1
fi

# Sync plugins (reactory-client-core & __runtime__ widgets)
if [ "$SCOPE" = "all" ] || [ "$SCOPE" = "plugins" ]; then
  # Ensure .js -> .min.js symlinks exist in local runtime plugins
  if [ -d "$SOURCE_DATA/plugins/__runtime__/lib" ]; then
    echo "🔗 Ensuring .js symlinks for runtime plugins..."
    (cd "$SOURCE_DATA/plugins/__runtime__/lib" && for f in *.min.js; do [ -f "$f" ] && ln -sf "$f" "${f%.min.js}.js"; done)
  fi

  TMP_PLUGINS="/tmp/plugins-sync-$$.tar.gz"
  echo "🗜️  Packaging plugins from ${SOURCE_DATA}..."
  COPYFILE_DISABLE=1 tar --format=ustar --exclude="node_modules" --exclude=".git" \
    -czf "$TMP_PLUGINS" \
    -C "$SOURCE_DATA" \
    plugins/reactory-client-core \
    plugins/__runtime__/lib \
    plugins/installed.json \
    plugins/available.json 2>/dev/null || true

  echo "🚀 Uploading plugins to ${POD_NAME}..."
  KUBECONFIG="$KUBECONFIG" kubectl cp "$TMP_PLUGINS" "${NAMESPACE}/${POD_NAME}:/tmp/plugins-sync.tar.gz"

  echo "📂 Extracting plugins in container..."
  KUBECONFIG="$KUBECONFIG" kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
    mkdir -p /reactory/reactory-data/plugins
    tar -xzf /tmp/plugins-sync.tar.gz -C /reactory/reactory-data
    rm -f /tmp/plugins-sync.tar.gz
    chmod -R a+rX /reactory/reactory-data/plugins
  "
  rm -f "$TMP_PLUGINS"
  echo "✅ Plugins synchronized."
fi

# Sync themes
if [ "$SCOPE" = "all" ] || [ "$SCOPE" = "themes" ]; then
  TMP_THEMES="/tmp/themes-sync-$.tar.gz"
  echo "🗜️  Packaging themes from ${SOURCE_DATA}..."
  COPYFILE_DISABLE=1 tar --format=ustar --exclude=".git" \
    -czf "$TMP_THEMES" \
    -C "$SOURCE_DATA" \
    themes 2>/dev/null || true

  echo "🚀 Uploading themes to ${POD_NAME}..."
  KUBECONFIG="$KUBECONFIG" kubectl cp "$TMP_THEMES" "${NAMESPACE}/${POD_NAME}:/tmp/themes-sync.tar.gz"

  echo "📂 Extracting themes in container..."
  KUBECONFIG="$KUBECONFIG" kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
    mkdir -p /reactory/reactory-data/themes
    tar -xzf /tmp/themes-sync.tar.gz -C /reactory/reactory-data
    rm -f /tmp/themes-sync.tar.gz
    chmod -R a+rX /reactory/reactory-data/themes
  "
  rm -f "$TMP_THEMES"
  echo "✅ Themes synchronized."
fi

# Sync content
if [ "$SCOPE" = "all" ] || [ "$SCOPE" = "pinned" ] || [ "$SCOPE" = "content" ]; then
  if [ -d "$SOURCE_DATA/content" ]; then
    TMP_CONTENT="/tmp/content-sync-$.tar.gz"
    echo "🗜️  Packaging content from ${SOURCE_DATA}..."
    COPYFILE_DISABLE=1 tar --format=ustar --exclude=".git" \
      -czf "$TMP_CONTENT" \
      -C "$SOURCE_DATA" \
      content 2>/dev/null || true

    echo "🚀 Uploading content to ${POD_NAME}..."
    KUBECONFIG="$KUBECONFIG" kubectl cp "$TMP_CONTENT" "${NAMESPACE}/${POD_NAME}:/tmp/content-sync.tar.gz"

    echo "📂 Extracting content in container..."
    KUBECONFIG="$KUBECONFIG" kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
      mkdir -p /reactory/reactory-data/content
      tar -xzf /tmp/content-sync.tar.gz -C /reactory/reactory-data
      rm -f /tmp/content-sync.tar.gz
      chmod -R a+rX /reactory/reactory-data/content
    "
    rm -f "$TMP_CONTENT"
    echo "✅ Content synchronized."
  fi
fi

# Sync i18n
if [ "$SCOPE" = "all" ] || [ "$SCOPE" = "pinned" ] || [ "$SCOPE" = "i18n" ]; then
  if [ -d "$SOURCE_DATA/i18n" ]; then
    TMP_I18N="/tmp/i18n-sync-$.tar.gz"
    echo "🗜️  Packaging i18n from ${SOURCE_DATA}..."
    COPYFILE_DISABLE=1 tar --format=ustar --exclude=".git" \
      -czf "$TMP_I18N" \
      -C "$SOURCE_DATA" \
      i18n 2>/dev/null || true

    echo "🚀 Uploading i18n to ${POD_NAME}..."
    KUBECONFIG="$KUBECONFIG" kubectl cp "$TMP_I18N" "${NAMESPACE}/${POD_NAME}:/tmp/i18n-sync.tar.gz"

    echo "📂 Extracting i18n in container..."
    KUBECONFIG="$KUBECONFIG" kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
      mkdir -p /reactory/reactory-data/i18n
      tar -xzf /tmp/i18n-sync.tar.gz -C /reactory/reactory-data
      rm -f /tmp/i18n-sync.tar.gz
      chmod -R a+rX /reactory/reactory-data/i18n
    "
    rm -f "$TMP_I18N"
    echo "✅ i18n synchronized."
  fi
fi

# Sync wordnet
if [ "$SCOPE" = "all" ] || [ "$SCOPE" = "pinned" ] || [ "$SCOPE" = "wordnet" ]; then
  if [ -d "$SOURCE_DATA/wordnet" ]; then
    TMP_WORDNET="/tmp/wordnet-sync-$.tar.gz"
    echo "🗜️  Packaging wordnet from ${SOURCE_DATA}..."
    COPYFILE_DISABLE=1 tar --format=ustar --exclude=".git" \
      -czf "$TMP_WORDNET" \
      -C "$SOURCE_DATA" \
      wordnet 2>/dev/null || true

    echo "🚀 Uploading wordnet to ${POD_NAME}..."
    KUBECONFIG="$KUBECONFIG" kubectl cp "$TMP_WORDNET" "${NAMESPACE}/${POD_NAME}:/tmp/wordnet-sync.tar.gz"

    echo "📂 Extracting wordnet in container..."
    KUBECONFIG="$KUBECONFIG" kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
      mkdir -p /reactory/reactory-data/wordnet
      tar -xzf /tmp/wordnet-sync.tar.gz -C /reactory/reactory-data
      rm -f /tmp/wordnet-sync.tar.gz
      chmod -R a+rX /reactory/reactory-data/wordnet
    "
    rm -f "$TMP_WORDNET"
    echo "✅ Wordnet synchronized."
  fi
fi

# Sync profiles (default & reactory)
if [ "$SCOPE" = "all" ] || [ "$SCOPE" = "pinned" ] || [ "$SCOPE" = "profiles" ]; then
  if [ -d "$SOURCE_DATA/profiles/default" ] || [ -d "$SOURCE_DATA/profiles/reactory" ]; then
    TMP_PROFILES="/tmp/profiles-sync-$.tar.gz"
    echo "🗜️  Packaging profiles (default, reactory) from ${SOURCE_DATA}..."
    COPYFILE_DISABLE=1 tar --format=ustar --exclude=".git" \
      -czf "$TMP_PROFILES" \
      -C "$SOURCE_DATA" \
      profiles/default \
      profiles/reactory 2>/dev/null || true

    echo "🚀 Uploading profiles to ${POD_NAME}..."
    KUBECONFIG="$KUBECONFIG" kubectl cp "$TMP_PROFILES" "${NAMESPACE}/${POD_NAME}:/tmp/profiles-sync.tar.gz"

    echo "📂 Extracting profiles in container..."
    KUBECONFIG="$KUBECONFIG" kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
      mkdir -p /reactory/reactory-data/profiles/default /reactory/reactory-data/profiles/reactory
      tar -xzf /tmp/profiles-sync.tar.gz -C /reactory/reactory-data
      rm -f /tmp/profiles-sync.tar.gz
      chmod -R a+rX /reactory/reactory-data/profiles
    "
    rm -f "$TMP_PROFILES"
    echo "✅ Profiles synchronized."
  fi
fi

# Sync fonts
if [ "$SCOPE" = "all" ] || [ "$SCOPE" = "pinned" ] || [ "$SCOPE" = "fonts" ]; then
  if [ -d "$SOURCE_DATA/fonts" ]; then
    TMP_FONTS="/tmp/fonts-sync-$.tar.gz"
    echo "🗜️  Packaging fonts from ${SOURCE_DATA}..."
    COPYFILE_DISABLE=1 tar --format=ustar --exclude=".git" \
      -czf "$TMP_FONTS" \
      -C "$SOURCE_DATA" \
      fonts 2>/dev/null || true

    echo "🚀 Uploading fonts to ${POD_NAME}..."
    KUBECONFIG="$KUBECONFIG" kubectl cp "$TMP_FONTS" "${NAMESPACE}/${POD_NAME}:/tmp/fonts-sync.tar.gz"

    echo "📂 Extracting fonts in container..."
    KUBECONFIG="$KUBECONFIG" kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "
      mkdir -p /reactory/reactory-data/fonts
      tar -xzf /tmp/fonts-sync.tar.gz -C /reactory/reactory-data
      rm -f /tmp/fonts-sync.tar.gz
      chmod -R a+rX /reactory/reactory-data/fonts
    "
    rm -f "$TMP_FONTS"
    echo "✅ Fonts synchronized."
  fi
fi

echo "🎉 All requested reactory-data successfully synchronized to ${POD_NAME}!"
