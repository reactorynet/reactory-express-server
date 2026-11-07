import Csv2JsonCliDefinition from '../../csv2json/csv2json';
import SchemaGenDefinition from '../../schema-gen/SchemaGen';
import ServiceGenDefinition from '../../service-gen/ServiceGen';

/**
 * REACTORY-302016408 / review finding N2.
 *
 * `csv2json`, `schema-gen` and `service-gen` all had the same defect as
 * `demographics-seed`: `bin/reactory` appended `--silent` to every non-verbose
 * invocation and these parsers reject unknown flags, so the documented plain
 * invocation could never run. They were fixed by calling `stripLauncherFlags()`, but
 * had no tests at all, so the fix was verified only by inspection.
 *
 * These cases pin the two properties the fix must have, per command:
 *   1. a forwarded `--silent` is ignored (the command reports its OWN problem, not
 *      "unknown argument --silent"), and
 *   2. strictness is unchanged - an unknown flag still errors, with or without
 *      `--silent` alongside it.
 *
 * Only the error paths are exercised: they run before any file I/O, so no fixtures
 * and no database are needed.
 */
describe('launcher-flag handling across the CLI family (REACTORY-302016408)', () => {
  let context: any;
  let exitSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  type CommandComponent = (args: string[], ctx: any) => Promise<void>;

  // The component signature is `TCli`; the cast is only to call it with the minimal
  // context below, so it goes through `unknown` (a direct cast is rejected as
  // non-overlapping by tsc).
  const asCommand = (component: unknown): CommandComponent =>
    component as unknown as CommandComponent;

  const commands = [
    {
      name: 'csv2json',
      component: asCommand(Csv2JsonCliDefinition.component),
      /** Its own "you passed nothing useful" error, i.e. the launcher flag was ignored. */
      ownError: /No arguments provided/,
    },
    {
      name: 'schema-gen',
      component: asCommand(SchemaGenDefinition.component),
      ownError: /No arguments provided/,
    },
    {
      name: 'service-gen',
      component: asCommand(ServiceGenDefinition.component),
      ownError: /No arguments provided/,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    context = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      getService: jest.fn(() => undefined),
      listServices: jest.fn(() => []),
      modules: [],
      state: {},
      readline: { write: jest.fn(), prompt: jest.fn(), close: jest.fn() },
    };

    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as any);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe.each(commands)('$name', ({ component, ownError }) => {
    it('ignores a forwarded --silent and reports its own problem instead', async () => {
      await expect(component(['--silent'], context)).rejects.toThrow('process.exit:1');

      expect(context.error).toHaveBeenCalledWith(expect.stringMatching(ownError));
      // The regression this ticket is about: --silent must never be reported to the
      // operator as though it were a typo.
      const messages: string[] = context.error.mock.calls.map((call: any[]) => `${call[0]}`);
      expect(messages.join('\n')).not.toMatch(/--silent/);
    });

    it('still rejects a genuine unknown flag when --silent is also present', async () => {
      await expect(component(['--silent', '--bogus'], context)).rejects.toThrow('process.exit:1');

      expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/Unknown argument: --bogus/));
    });

    it('still rejects a genuine unknown flag on its own (strictness unchanged)', async () => {
      await expect(component(['--bogus'], context)).rejects.toThrow('process.exit:1');

      expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/Unknown argument: --bogus/));
    });
  });
});
