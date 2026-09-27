import type Reactory from '@reactorynet/reactory-core';

/**
 * Runtime values of `Reactory.Models.ReactoryCalendarVisibility`.
 *
 * `@reactorynet/reactory-core` ships that enum in its type definitions only;
 * the package's runtime exports have no `Models`. Code that read
 * `Models.ReactoryCalendarVisibility.PUBLIC` (or the `Reactory.Models`
 * namespace) at runtime threw a TypeError, so every calendar access check for
 * a non-owner failed. Use these constants for values; keep the Reactory type
 * for annotations.
 */
export const CalendarVisibility = {
  PRIVATE: 'private',
  SHARED: 'shared',
  APPLICATION: 'application',
  ORGANIZATION: 'organization',
  PUBLIC: 'public',
} as const as unknown as typeof Reactory.Models.ReactoryCalendarVisibility;

export default CalendarVisibility;
