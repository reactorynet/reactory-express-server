import ReactoryContentResolver from '../ReactoryContentResolver';

describe('ReactoryContentResolver', () => {
  let resolver: ReactoryContentResolver;
  let mockContext: any;
  let mockUserService: any;

  beforeEach(() => {
    mockUserService = {
      findUserById: jest.fn().mockImplementation(async (id: string) => ({
        _id: id,
        id,
        email: 'user@reactory.net',
        firstName: 'Test',
        lastName: 'User',
      })),
      findUserWithEmail: jest.fn().mockImplementation(async (email: string) => ({
        _id: 'user_email_id',
        id: 'user_email_id',
        email,
        firstName: 'Email',
        lastName: 'User',
      })),
    };

    mockContext = {
      getService: jest.fn().mockReturnValue(mockUserService),
      user: { id: 'context_user_id', _id: 'context_user_id', email: 'context@reactory.net' },
      partner: { email: 'partner@reactory.net' },
      hasRole: jest.fn().mockReturnValue(true),
    };

    resolver = new ReactoryContentResolver();
  });

  it('should resolve createdBy when createdBy is a user ID string', async () => {
    const parent = {
      slug: 'test-slug',
      createdBy: 'user_123',
    } as any;

    const user = await resolver.createdBy(parent, {}, mockContext);
    expect(user).not.toBeNull();
    expect(user.id).toBe('user_123');
    expect(mockUserService.findUserById).toHaveBeenCalledWith('user_123');
  });

  it('should resolve createdBy when createdBy is an object with email', async () => {
    const parent = {
      slug: 'test-slug',
      createdBy: { email: 'author@reactory.net' },
    } as any;

    const user = await resolver.createdBy(parent, {}, mockContext);
    expect(user).not.toBeNull();
    expect(user.id).toBe('user_email_id');
    expect(user.email).toBe('author@reactory.net');
  });

  it('should fallback to system user when createdBy is null or missing id', async () => {
    mockUserService.findUserWithEmail.mockResolvedValue(null);
    mockContext.user = { _id: 'anon_user', firstName: 'Anon' }; // Non-null context user

    const parent = {
      slug: 'test-slug',
      createdBy: null,
    } as any;

    const user = await resolver.createdBy(parent, {}, mockContext);
    expect(user).not.toBeNull();
    expect(user.id).toBe('anon_user');
  });

  it('should fallback to default system account if user has no id', async () => {
    mockUserService.findUserWithEmail.mockResolvedValue(null);
    mockContext.user = { email: 'anon@reactory.net' }; // No id / _id

    const parent = {
      slug: 'test-slug',
      createdBy: null,
    } as any;

    const user = await resolver.createdBy(parent, {}, mockContext);
    expect(user).not.toBeNull();
    expect(user.id).toBe('000000000000000000000000');
    expect(user.email).toBe('system@reactory.net');
  });

  it('should resolve updatedBy properly', async () => {
    const parent = {
      slug: 'test-slug',
      updatedBy: 'updater_456',
    } as any;

    const user = await resolver.updatedBy(parent, {}, mockContext);
    expect(user).not.toBeNull();
    expect(user.id).toBe('updater_456');
  });
});
