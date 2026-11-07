import {
  LAUNCHER_RESERVED_FLAGS,
  isLauncherReservedFlag,
  stripLauncherFlags,
} from '../platformFlags';

/**
 * REACTORY-302016408.
 *
 * `bin/reactory` used to append `--silent` to every non-verbose invocation, which
 * made strict sub-command parsers reject the documented plain command. The launcher
 * no longer forwards its own flags, and sub-commands strip any that do arrive. These
 * tests pin the important half of that contract: only the launcher-reserved flags are
 * dropped, so the strictness that catches typos is preserved.
 */
describe('launcher/sub-command argument contract', () => {
  describe('LAUNCHER_RESERVED_FLAGS', () => {
    it('reserves --silent', () => {
      expect(LAUNCHER_RESERVED_FLAGS.has('--silent')).toBe(true);
    });

    it('does not reserve -v/--verbose, which individual commands may own', () => {
      expect(LAUNCHER_RESERVED_FLAGS.has('-v')).toBe(false);
      expect(LAUNCHER_RESERVED_FLAGS.has('--verbose')).toBe(false);
    });
  });

  describe('isLauncherReservedFlag', () => {
    it.each(['--silent', '--silent=true', '--silent=1'])('recognises %s', (token) => {
      expect(isLauncherReservedFlag(token)).toBe(true);
    });

    it.each(['--silentfoo', '--silently', '--silents', '--org', '-v', '--verbose', 'help', ''])(
      'does not match %s',
      (token) => {
        expect(isLauncherReservedFlag(token)).toBe(false);
      },
    );
  });

  describe('stripLauncherFlags', () => {
    it('leaves a caller argument list untouched when no launcher flag is present', () => {
      const argv = ['--organizationIds', '665f0c1a2b3c4d5e6f708192', '--help'];

      expect(stripLauncherFlags(argv)).toEqual(argv);
    });

    it('removes --silent without disturbing order or values', () => {
      expect(stripLauncherFlags(['--organizationIds', 'a,b', '--silent']))
        .toEqual(['--organizationIds', 'a,b']);
      expect(stripLauncherFlags(['--silent', '--organizationIds', 'a,b']))
        .toEqual(['--organizationIds', 'a,b']);
    });

    it('removes the --silent=<value> spelling too', () => {
      expect(stripLauncherFlags(['--silent=true', '--apply'])).toEqual(['--apply']);
    });

    it('does not mutate the caller array', () => {
      const argv = ['--apply', '--silent'];

      stripLauncherFlags(argv);

      expect(argv).toEqual(['--apply', '--silent']);
    });

    it('keeps every non-reserved flag so the sub-command parser can reject it', () => {
      expect(stripLauncherFlags(['--organizationId', 'x', '--silent']))
        .toEqual(['--organizationId', 'x']);
      expect(stripLauncherFlags(['-v'])).toEqual(['-v']);
    });

    it('tolerates a missing or non-array argument list', () => {
      expect(stripLauncherFlags()).toEqual([]);
      expect(stripLauncherFlags(undefined as any)).toEqual([]);
      expect(stripLauncherFlags(null as any)).toEqual([]);
    });

    it('keeps non-string tokens verbatim instead of throwing', () => {
      expect(stripLauncherFlags([123 as any, '--silent'])).toEqual([123]);
      expect(stripLauncherFlags([null as any, '--silent'])).toEqual([null]);
    });
  });
});
