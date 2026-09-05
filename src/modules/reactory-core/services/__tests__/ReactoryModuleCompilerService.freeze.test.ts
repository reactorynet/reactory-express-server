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

  it('prohibits build invocation and returns failure resource when compiled widget is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    const fakeModule: any = {
      id: 'test.MissingWidget@1.0.0',
      src: 'export const Test = () => null;',
      components: [
        { nameSpace: 'test', name: 'MissingWidget', version: '1.0.0' }
      ]
    };

    const res = await service.compileModule(fakeModule);

    expect(res).toBeDefined();
    expect(res.uri).toContain('error=true');
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('[Production Freeze]'),
      expect.any(Object),
      'error',
      expect.any(String)
    );

    // Verify fallback script file was written
    const dataRoot = getDataRoot();
    const compiledFile = path.join(dataRoot, 'plugins', '__runtime__', `lib/${fakeModule.id}.min.js`);
    expect(fs.existsSync(compiledFile)).toBe(true);
    const content = fs.readFileSync(compiledFile, 'utf8');
    expect(content).toContain('Component Unavailable: test.MissingWidget');
    expect(content).toContain('$reactory.createNotification');

    // Clean up
    try {
      fs.unlinkSync(compiledFile);
    } catch {
      // ignore
    }
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
