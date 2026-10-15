import fs from 'fs';
import path from 'path';
import ReactoryModuleCompilerService, { getDataRoot } from '../ReactoryModuleCompilerService';

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
  user: { _id: 'u1' },
} as any;

describe('ReactoryModuleCompilerService Production Guardrails', () => {
  const originalEnv = process.env.NODE_ENV;
  let service: ReactoryModuleCompilerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReactoryModuleCompilerService({}, mockContext);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('prohibits build invocation and returns the bundle url without writing to disk when the compiled widget is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    const fakeModule: any = {
      id: 'test.MissingWidget@1.0.0',
      src: 'export const Test = () => null;',
      components: [
        { nameSpace: 'test', name: 'MissingWidget', version: '1.0.0' }
      ]
    };

    // Precondition: no compiled bundle on disk, so the production branch is the
    // one under test rather than the "serve the existing asset" branch.
    const dataRoot = getDataRoot();
    const compiledFile = path.join(dataRoot, 'plugins', '__runtime__', `lib/${fakeModule.id}.min.js`);
    try {
      fs.unlinkSync(compiledFile);
    } catch {
      // ignore - absent is what we want
    }
    expect(fs.existsSync(compiledFile)).toBe(false);

    const res = await service.compileModule(fakeModule);

    expect(res).toBeDefined();

    // The point of the production freeze: never build, and never touch the data
    // volume. The previous revision of this test asserted the opposite - that a
    // "Component Unavailable" failure stub had been written to disk - which is
    // exactly what 184cd73a set out to stop. Asserting the file is still absent
    // pins that guarantee rather than a presentation detail.
    expect(fs.existsSync(compiledFile)).toBe(false);

    // It still hands back a servable script resource for the module.
    expect(res.type).toBe('script');
    expect(res.uri).toContain(`lib/${fakeModule.id}.min.js`);
    expect(res.id).toBe(fakeModule.id);
    expect(res.signed).toBe(true);

    // And it says so, at warn level: a missing bundle in production is a
    // degraded state, not a crash.
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('[Production Freeze]'),
      expect.any(Object),
      'warn',
      expect.any(String)
    );
  });

  it('serves existing compiled widget in production without invoking compilation', async () => {
    process.env.NODE_ENV = 'production';
    const fakeModule: any = {
      id: 'test.ExistingWidget@1.0.0',
      src: 'export const Existing = () => <div>Hello</div>;',
    };

    const dataRoot = getDataRoot();
    const libDir = path.join(dataRoot, 'plugins', '__runtime__', 'lib');
    if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });
    const compiledFile = path.join(libDir, `${fakeModule.id}.min.js`);
    fs.writeFileSync(compiledFile, 'console.log("precompiled");', 'utf8');

    const res = await service.compileModule(fakeModule);

    expect(res).toBeDefined();
    expect(res.uri).toContain(`lib/${fakeModule.id}.min.js`);
    expect(res.signed).toBe(true);
    // Should NOT log any production freeze error
    expect(mockContext.log).not.toHaveBeenCalledWith(
      expect.stringContaining('[Production Freeze]'),
      expect.any(Object),
      expect.any(String),
      expect.any(String)
    );

    // Clean up
    try {
      fs.unlinkSync(compiledFile);
    } catch {
      // ignore
    }
  });
});
