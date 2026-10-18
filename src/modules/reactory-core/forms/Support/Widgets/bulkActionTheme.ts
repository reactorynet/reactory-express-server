/**
 * Shared styling for the selected-ticket preview rendered by every bulk action
 * dialog (status / assign / tags / delete).
 *
 * REACTORY-302016408/20261017/1703068768.
 *
 * The previews used a hard-coded `bgcolor: 'grey.50'`. MUI's `grey` palette is
 * NOT mode aware: `grey.50` is #fafafa in both light and dark mode. In dark mode
 * the list text is white (`text.primary`), so the preview rendered white text on
 * a near-white panel - effectively invisible. Resolve the surface from the theme
 * mode instead, so the panel stays a subtle contrast against the dialog paper in
 * both modes: #fafafa on the light paper (#fff) and #212121 on the dark paper
 * (#121212).
 */

export type ThemeModeLike = {
  palette?: {
    mode?: string;
  };
};

/** Surface used behind the "Selected Tickets" preview, per theme mode. */
export const SELECTED_TICKETS_SURFACE = {
  light: 'grey.50',
  dark: 'grey.900',
} as const;

export type SelectedTicketsSurface = (typeof SELECTED_TICKETS_SURFACE)[keyof typeof SELECTED_TICKETS_SURFACE];

/**
 * Resolve the preview surface for the active theme. Anything that is not
 * explicitly dark falls back to the light surface, matching MUI's default.
 */
export const resolveSelectedTicketsSurface = (theme?: ThemeModeLike): SelectedTicketsSurface =>
  theme?.palette?.mode === 'dark' ? SELECTED_TICKETS_SURFACE.dark : SELECTED_TICKETS_SURFACE.light;

export interface SelectedTicketsListSxOptions {
  /** Maximum height of the scrollable list; the delete dialog uses a taller list. */
  maxHeight?: number;
}

/**
 * Builds the `sx` prop for the selected-ticket list. The returned callback is
 * MUI's theme-aware `sx` form, so the surface follows the live theme and
 * re-resolves when the user toggles light/dark mode.
 */
export const getSelectedTicketsListSx =
  (options: SelectedTicketsListSxOptions = {}) =>
  (theme?: ThemeModeLike) => ({
    maxHeight: options.maxHeight ?? 200,
    overflow: 'auto' as const,
    bgcolor: resolveSelectedTicketsSurface(theme),
    borderRadius: 1,
  });
