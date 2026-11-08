import supportWidgetModules from '../SupportTickets/modules';

/**
 * REACTORY-302016408/20261107/3504359551.
 *
 * The "Action with AI" launcher used to carry its own folder picker: a
 * `ReactoryServerFiles` query that requested folder NAMES only, plus client-side
 * path joining (`base + '/' + folder.name`) for drill-down. That worked only for
 * as long as `ReactoryFileService.getServerFiles` kept returning
 * `path: dirent.name`; the moment it reported something else, drill-down broke
 * silently and a wrong workdir was persisted.
 *
 * The picker is now the registered, shared `core.ServerFileExplorer@1.0.0`,
 * which reports the resolver's `fullPath` verbatim. These assertions are a
 * source-level guard (the widget is only compiled into a client plugin, so it
 * cannot be rendered from this repository): they fail if the inline browser -
 * or any of its fragile assumptions - ever comes back, if the component is
 * statically imported instead of resolved from the registry, or if the picker
 * stops being gated on the roles the explorer itself requires.
 */
describe('support ticket AI action — shared folder browser', () => {
  const manifest = supportWidgetModules.find(
    (entry) => entry.id === 'core.SupportTicketAIAction@1.0.0',
  );
  const source = manifest?.src || '';

  /** Source with comments stripped, so prose about the old picker is ignored. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('is registered in the widget manifest', () => {
    expect(manifest).toBeTruthy();
  });

  it('no longer queries ReactoryServerFiles itself', () => {
    expect(code).not.toContain('ReactoryServerFiles');
    expect(code).not.toContain('SERVER_FOLDERS_QUERY');
    expect(code).not.toContain('loadOptions');
  });

  it('no longer carries the inline folder browser', () => {
    const removed = [
      'loadFolders',
      'browseInto',
      'browseUp',
      'usePickerPath',
      'pickerPath',
      'pickerFolders',
      'pickerLoading',
      'pickerError',
    ];

    removed.forEach((symbol) => {
      expect(code).not.toContain(symbol);
    });
  });

  it('resolves the shared explorer through the component registry', () => {
    expect(code).toContain('core.ServerFileExplorer@1.0.0');
    expect(code).toContain('getComponents');
    // A static import cannot resolve: the widget is packaged as a client plugin.
    expect(code).not.toMatch(/import[^\n]*ServerFileExplorer/);
    expect(code).not.toMatch(/from\s+['"][^'"]*ServerFileExplorer[^'"]*['"]/);
  });

  it('sets the workdir from the reported fullPath', () => {
    expect(code).toMatch(/onFolderSelection=\{handleFolderSelection\}/);
    expect(code).toContain('fullPath');
    // The handler must not join paths client-side again.
    expect(code).not.toMatch(/fullPath[^\n]*\+\s*['"]/);
  });

  it('seeds the explorer with an absolute path only', () => {
    // getServerFiles only returns an absolute fullPath for an absolute request,
    // so a templated/relative seed would persist an unusable workdir.
    expect(code).toMatch(/isAbsoluteServerPath/);
    expect(code).toMatch(/startsWith\('\/'\)/);
  });

  it('gates the picker on the roles the explorer requires', () => {
    expect(code).toMatch(/hasRole\(\s*FOLDER_BROWSER_ROLES\s*\)/);
    expect(code).toMatch(/'ADMIN'/);
    expect(code).toMatch(/'DEVELOPER'/);
    // Nothing is mounted for a caller that may not use the explorer.
    expect(code).toMatch(/canBrowseFolders\s*&&\s*ServerFileExplorer/);
  });

  it('mounts the explorer read-only', () => {
    expect(code).toMatch(/readonly/);
    expect(code).toContain('allowUpload={false}');
    expect(code).toContain('allowCreateFolder={false}');
    expect(code).toContain('allowDelete={false}');
    expect(code).toContain('allowRename={false}');
  });

  it('keeps the workdir text field as the manual override', () => {
    expect(code).toContain('label="Repository (workdir)"');
  });
});
