// this file is required

// Import DSL test environment setup
import setupTestEnvironment from '../../src/reactory/dsl/tests/setup/testEnvironment';

// Set up test environment for DSL tests
setupTestEnvironment();

/**
 * Test Helpers for Reactory Classroom Module
 */
const classroomTestHelpers = {
  createMockCourse: () => ({
    _id: 'course-123',
    title: 'Test Course',
    description: 'A test course',
    status: 'published',
    instructorId: 'instructor-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  createMockEnrollment: () => ({
    _id: 'enrollment-123',
    courseId: 'course-123',
    studentId: 'student-123',
    status: 'active',
    enrolledAt: new Date(),
    role: 'student',
    progress: 0,
    completedAt: null,
  }),

  createMockAssignment: () => ({
    _id: 'assignment-123',
    courseId: 'course-123',
    title: 'Test Assignment',
    description: 'A test assignment',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    points: 100,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  createMockUser: (overrides?: any) => ({
    _id: 'user-123',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  createMockProgress: () => ({
    _id: 'progress-123',
    enrollmentId: 'enrollment-123',
    courseId: 'course-123',
    studentId: 'student-123',
    percentComplete: 45,
    lastAccessedAt: new Date(),
    assignmentsCompleted: 3,
    assignmentsTotal: 8,
    status: 'in-progress',
  }),
};

// Attach test helpers to global object
(global as any).testHelpers = classroomTestHelpers;

/**
 * Test Helpers for Reactory Knowledge Base Module
 */
const kbTestHelpers = {
  createMockKnowledgeBase: (overrides?: any) => ({
    _id: 'kb-123',
    title: 'Test Knowledge Base',
    description: 'A test knowledge base',
    contentType: 'knowledge-base' as const,
    status: 'published',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    published: true,
    viewCount: 42,
    ...overrides,
  }),

  createMockArticle: (overrides?: any) => ({
    _id: 'article-123',
    title: 'Test Article',
    slug: 'test-article',
    description: 'A test article',
    content: 'This is test content for the article.',
    contentType: 'article' as const,
    status: 'published',
    knowledgeBase: 'kb-123',
    categories: [],
    tags: ['test', 'example'],
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    published: true,
    viewCount: 10,
    lng: 'en',
    ...overrides,
  }),

  createMockCategory: (overrides?: any) => ({
    _id: 'category-123',
    title: 'Test Category',
    slug: 'test-category',
    description: 'A test category',
    contentType: 'category' as const,
    knowledgeBase: 'kb-123',
    parentCategory: null,
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    published: true,
    ...overrides,
  }),

  createMockComment: (overrides?: any) => ({
    _id: 'comment-123',
    contentId: 'article-123',
    author: 'user-123',
    text: 'Test comment',
    createdAt: new Date(),
    updatedAt: new Date(),
    replies: [],
    likes: 0,
    ...overrides,
  }),

  createMockBookmark: (overrides?: any) => ({
    _id: 'bookmark-123',
    contentId: 'article-123',
    userId: 'user-123',
    createdAt: new Date(),
    ...overrides,
  }),

  createMockVersion: (overrides?: any) => ({
    _id: 'version-123',
    contentId: 'article-123',
    versionNumber: 1,
    content: 'Version 1 content',
    summary: 'Initial version',
    author: 'user-123',
    createdAt: new Date(),
    changeSummary: 'Version 1',
    ...overrides,
  }),

  createMockAttachment: (overrides?: any) => ({
    _id: 'attachment-123',
    contentId: 'article-123',
    fileId: 'file-123',
    fileName: 'test-file.pdf',
    fileSize: 1024,
    fileType: 'application/pdf',
    uploadedBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  }),

  createMockUser: (overrides?: any) => ({
    _id: 'user-123',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

// Context helper for creating mock contexts with required methods
const createMockContext = (overrides?: any) => ({
  user: kbTestHelpers.createMockUser({ _id: 'user-123' }),
  getService: jest.fn().mockReturnValue(null),
  log: jest.fn(),
  hasRole: jest.fn().mockReturnValue(true),
  ...overrides,
});

// Attach KB helpers to global test helpers
(global as any).testHelpers = {
  ...classroomTestHelpers,
  ...kbTestHelpers,
  createMockContext,
};