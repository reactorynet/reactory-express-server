import fs from 'fs';
import path from 'path';
import Reactory from '@reactorynet/reactory-core';
import ApiError from '@reactory/server-core/exceptions';

/**
 * A document that owns a set of themes and an active-theme pointer.
 *
 * `ReactoryClient` and `Organization` both persist `themes` as `[Mixed]` and
 * keep `theme` as a *name* pointer, so one implementation can serve both
 * (design decision D1). The interface is intentionally structural: a Mongoose
 * document satisfies it as-is, which keeps the helper testable with a plain
 * object.
 */
export interface IThemeHolder {
  /** The themes stored on the holder. `[Mixed]` in both models. */
  themes?: any[];
  /** Name (or, historically, id) of the active theme. */
  theme?: string | null;
  /** Active theme mode: `light`, `dark` or `os` where supported. */
  themeMode?: string | null;
  /** Persists the holder. */
  save: () => Promise<any>;
  /** Mongoose documents expose this; plain test doubles may not. */
  markModified?: (path: string) => void;
}

export interface ISetActiveThemeOptions {
  /**
   * When true (the default) the theme name must resolve to a theme on the
   * holder. `SystemService` opts out because its pre-existing contract stores
   * the pointer without validating it.
   */
  requireExisting?: boolean;
}

export interface IDeleteThemeOptions {
  /**
   * Value used for the active-theme pointer when the last theme is deleted.
   * Defaults to `null` - no dangling pointer. `SystemService` passes
   * `'reactory'` to preserve its legacy fallback.
   */
  emptyFallback?: string | null;
}

/**
 * Shared theme operations for any document that holds `themes` / `theme`.
 *
 * Extracted from `SystemService` (ORG-004) so `ReactoryClient` and
 * `Organization` share exactly one implementation. The methods are stateless;
 * a holder is always passed in explicitly.
 */
export class ThemeService {
  /**
   * @param context optional execution context, used only for logging failures
   * that the caller deliberately does not propagate (asset linking).
   */
  constructor(private readonly context?: Reactory.Server.IReactoryContext) {}

  private static dataRoot(): string {
    return process.env.APP_DATA_ROOT || path.join(process.cwd(), '../reactory-data');
  }

  /**
   * Resolves the folder that holds a theme's published assets.
   *
   * Theme names are used as a path segment, so separators and dot-only names
   * are rejected: `OrganizationPublishThemeCss` accepts a caller-supplied
   * theme name, and without this guard it would be an arbitrary file write.
   * Legitimate names (including names with spaces) are unaffected.
   */
  private static themeFolder(themeName: string): string {
    const name = `${themeName ?? ''}`;
    if (name.trim().length === 0 || name === '.' || name === '..' || /[\\/]/.test(name)) {
      throw new ApiError(`Invalid theme name "${themeName}"`);
    }
    return path.join(ThemeService.dataRoot(), 'themes', name);
  }

  private static themesOf(holder: IThemeHolder): any[] {
    return Array.isArray(holder?.themes) ? holder.themes : [];
  }

  private static markThemesModified(holder: IThemeHolder): void {
    if (typeof holder?.markModified === 'function') holder.markModified('themes');
  }

  /**
   * Finds a theme by name or id. Kept in one place so save and delete cannot
   * drift apart on what counts as the same theme.
   */
  private static indexOfTheme(themes: any[], key?: string | null): number {
    if (key === undefined || key === null) return -1;
    return themes.findIndex(
      (theme: any) => theme !== null && theme !== undefined && (theme.name === key || theme.id === key),
    );
  }

  /**
   * Creates or updates a theme.
   *
   * A theme is matched by `name` or (when supplied) `id`; a match is merged
   * into the existing entry so partial updates keep the fields the caller did
   * not send. Otherwise the theme is appended. Returns the saved holder.
   */
  async saveTheme<T extends IThemeHolder>(holder: T, theme: any): Promise<T> {
    // `theme` is the active-theme pointer, so an unnamed theme could never be
    // activated. Reject it here rather than storing an unusable entry.
    if (!theme || typeof theme.name !== 'string' || theme.name.trim().length === 0) {
      throw new ApiError('A theme must have a non-empty name', { theme });
    }

    const themes = [...ThemeService.themesOf(holder)];
    let index = ThemeService.indexOfTheme(themes, theme?.name);
    if (index < 0 && theme?.id) index = ThemeService.indexOfTheme(themes, theme.id);

    if (index >= 0) {
      themes[index] = { ...themes[index], ...theme };
    } else {
      themes.push(theme);
    }

    holder.themes = themes;
    ThemeService.markThemesModified(holder);
    await holder.save();
    return holder;
  }

  /**
   * Deletes a theme by name or id.
   *
   * If the deleted theme was the active one, the first remaining theme (in
   * insertion order, so the outcome is deterministic) becomes active. When no
   * themes remain the pointer is cleared rather than left dangling - `null` by
   * default, or the caller's `emptyFallback`.
   */
  async deleteTheme<T extends IThemeHolder>(
    holder: T,
    themeName: string,
    options: IDeleteThemeOptions = {},
  ): Promise<T> {
    const emptyFallback = options.emptyFallback === undefined ? null : options.emptyFallback;
    const current = ThemeService.themesOf(holder);
    const removed = current.filter(
      (theme: any) => theme !== null && theme !== undefined && (theme.name === themeName || theme.id === themeName),
    );
    const remaining = current.filter(
      (theme: any) => theme === null || theme === undefined || (theme.name !== themeName && theme.id !== themeName),
    );

    holder.themes = remaining;

    const hasActivePointer = holder.theme !== undefined && holder.theme !== null;
    const activeWasRemoved = hasActivePointer && removed.some(
      (theme: any) => holder.theme === theme.name || holder.theme === theme.id,
    );
    if (activeWasRemoved || holder.theme === themeName) {
      // `||` (not `??`) so an unnamed first theme cannot become an empty
      // pointer; the legacy client behaviour used the same expression.
      holder.theme = remaining.length > 0 ? remaining[0]?.name || emptyFallback : emptyFallback;
    }

    ThemeService.markThemesModified(holder);
    await holder.save();
    return holder;
  }

  /**
   * Sets the active theme pointer, and optionally the active mode.
   *
   * By default the name must resolve to an existing theme; storing an unknown
   * name would leave every reader resolving a dangling pointer. Pass
   * `{ requireExisting: false }` only to preserve a legacy contract that
   * predates this validation.
   */
  async setActiveTheme<T extends IThemeHolder>(
    holder: T,
    themeName: string,
    mode?: string | null,
    options: ISetActiveThemeOptions = {},
  ): Promise<T> {
    const requireExisting = options.requireExisting !== false;
    const themes = ThemeService.themesOf(holder);

    if (requireExisting && ThemeService.indexOfTheme(themes, themeName) < 0) {
      const available = themes
        .map((theme: any) => theme?.name)
        .filter((name: any) => typeof name === 'string' && name.length > 0);
      throw new ApiError(
        available.length > 0
          ? `Theme "${themeName}" is not available on this record. Known themes: ${available.join(', ')}`
          : `Theme "${themeName}" is not available on this record; it has no themes`,
        { themeName, available },
      );
    }

    holder.theme = themeName;
    if (mode !== undefined) holder.themeMode = mode;

    await holder.save();
    return holder;
  }

  /**
   * Writes a theme's custom CSS to `$APP_DATA_ROOT/themes/<theme>/styles.css`.
   *
   * When a holder is supplied the theme also gets (or updates) a `styles`
   * asset entry pointing at the published file, exactly as the client
   * implementation did. Linking failures are logged and never fail the publish
   * - the CSS is already on disk.
   */
  async publishThemeCss(themeName: string, cssContent: string, holder?: IThemeHolder): Promise<boolean> {
    const themeFolder = ThemeService.themeFolder(themeName);

    if (!fs.existsSync(themeFolder)) {
      fs.mkdirSync(themeFolder, { recursive: true });
    }

    const cssPath = path.join(themeFolder, 'styles.css');
    fs.writeFileSync(cssPath, cssContent, { encoding: 'utf-8' });

    if (holder) {
      try {
        const themes = [...ThemeService.themesOf(holder)];
        const themeIdx = themes.findIndex((theme: any) => theme?.name === themeName);
        if (themeIdx >= 0) {
          const assets = Array.isArray(themes[themeIdx].assets) ? [...themes[themeIdx].assets] : [];
          const cssAssetIdx = assets.findIndex((asset: any) => asset?.assetType === 'css' || asset?.id === 'styles');
          const cssAsset = {
            id: 'styles',
            name: 'styles.css',
            assetType: 'css',
            url: `themes/${themeName}/styles.css`,
          };
          if (cssAssetIdx >= 0) {
            assets[cssAssetIdx] = cssAsset;
          } else {
            assets.push(cssAsset);
          }
          themes[themeIdx] = { ...themes[themeIdx], assets };
          holder.themes = themes;
          ThemeService.markThemesModified(holder);
          await holder.save();
        }
      } catch (err) {
        this.context?.error?.(`Failed to link styles.css asset on theme holder: ${err?.message ?? err}`);
      }
    }

    return true;
  }

  /**
   * Reads a theme's published CSS. Returns an empty string when nothing has
   * been published.
   */
  async getThemeCss(themeName: string): Promise<string> {
    const cssPath = path.join(ThemeService.themeFolder(themeName), 'styles.css');
    if (fs.existsSync(cssPath)) {
      return fs.readFileSync(cssPath, { encoding: 'utf-8' });
    }
    return '';
  }
}

export default ThemeService;
