import fs from 'fs';
import path from 'path';
import {
  SELECTED_TICKETS_SURFACE,
  getSelectedTicketsListSx,
  resolveSelectedTicketsSurface,
} from '../Widgets/bulkActionTheme';

/**
 * REACTORY-302016408/20261017/1703068768.
 *
 * The "Selected Tickets" preview in the multi-ticket action dialogs used a
 * hard-coded `bgcolor: 'grey.50'`. MUI's grey palette does not change with the
 * theme, so dark mode rendered white (`text.primary`) on #fafafa - invisible.
 * The surface must follow the theme, and every bulk action dialog must use the
 * shared style so the fix cannot drift back per-dialog.
 */
describe('bulk action selected-ticket preview - dark mode', () => {
  const darkTheme = { palette: { mode: 'dark' } };
  const lightTheme = { palette: { mode: 'light' } };

  // MUI grey palette entries are mode independent.
  const GREY_HEX = { 50: '#fafafa', 900: '#212121' } as const;
  // `text.primary`/`text.secondary` in each mode, as composited hex values.
  const TEXT_HEX = {
    darkPrimary: '#e0e0e0',
    lightPrimary: '#1f1f1f',
  } as const;

  const channelLuminance = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const relativeLuminance = (hex: string): number => {
    const value = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
    return (
      0.2126 * channelLuminance(r) +
      0.7152 * channelLuminance(g) +
      0.0722 * channelLuminance(b)
    );
  };

  const contrastRatio = (a: string, b: string): number => {
    const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
  };

  it('resolves a dark surface when the theme is in dark mode', () => {
    const sx = getSelectedTicketsListSx();

    expect(sx(darkTheme).bgcolor).toBe('grey.900');
    // The reported bug: the light surface was used in dark mode.
    expect(sx(darkTheme).bgcolor).not.toBe(SELECTED_TICKETS_SURFACE.light);
  });

  it('keeps the light surface for light mode and when no theme is available', () => {
    const sx = getSelectedTicketsListSx();

    expect(sx(lightTheme).bgcolor).toBe('grey.50');
    expect(sx(undefined).bgcolor).toBe('grey.50');
    expect(resolveSelectedTicketsSurface(undefined)).toBe('grey.50');
  });

  it('keeps the ticket text readable on the resolved surface', () => {
    // Dark mode: dark panel + light text clears WCAG AA (4.5:1).
    expect(contrastRatio(GREY_HEX[900], TEXT_HEX.darkPrimary)).toBeGreaterThanOrEqual(4.5);
    // Light mode: unchanged from before the fix.
    expect(contrastRatio(GREY_HEX[50], TEXT_HEX.lightPrimary)).toBeGreaterThanOrEqual(4.5);

    // Regression guard: the old, hard-coded surface produced ~1:1 white-on-white.
    expect(contrastRatio(GREY_HEX[50], TEXT_HEX.darkPrimary)).toBeLessThan(1.5);
  });

  it('preserves the list geometry the dialogs relied on', () => {
    expect(getSelectedTicketsListSx()(lightTheme)).toMatchObject({
      maxHeight: 200,
      overflow: 'auto',
      borderRadius: 1,
    });
    expect(getSelectedTicketsListSx({ maxHeight: 250 })(lightTheme).maxHeight).toBe(250);
  });

  it.each([
    'core.BulkStatusChangeAction.tsx',
    'core.BulkAssignAction.tsx',
    'core.BulkTagAction.tsx',
    'core.BulkDeleteAction.tsx',
  ])('%s renders the preview through the shared theme-aware style', (file) => {
    const source = fs.readFileSync(path.resolve(__dirname, '../Widgets', file), 'utf8');

    expect(source).toContain('getSelectedTicketsListSx');
    // No hard-coded light surface may creep back into any of the dialogs.
    expect(source).not.toMatch(/bgcolor:\s*'grey\.50'/);
    expect(source).not.toMatch(/bgcolor:\s*'#f[0-9a-f]{2,5}'/i);
  });
});
