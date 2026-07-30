// this file is required

// Import DSL test environment setup
import setupTestEnvironment from '../../src/reactory/dsl/tests/setup/testEnvironment';

// Set up test environment for DSL tests
setupTestEnvironment();

/**
 * Test Helpers for Reactory Classroom Module
 */
const classroomTestHelpers = {
  // NOTE: classroom entities are TypeORM (Postgres) - resolvers read `obj.id`,
  // not `obj._id` (that's the KB/Mongoose convention below). `overrides` was
  // previously silently ignored on 4 of these 5 helpers, which is why so many
  // classroom tests that called e.g. createMockCourse({ id: 'course-123' })
  // always got the same hardcoded id back regardless of what they asked for.
  // These mirror the TypeORM entities field-for-field. Fields that are non-null in the
  // GraphQL schema (Course.code, Assignment.assignmentType, ...) must be present, or
  // resolver tests fail with "Cannot return null for non-nullable field" - a schema-shape
  // problem that reads as a resolver bug.
  createMockCourse: (overrides: any = {}) => ({
    id: 'course-123',
    title: 'Test Course',
    description: 'A test course',
    code: 'TEST-101',
    status: 'published',
    instructorId: 'instructor-123',
    organizationId: null,
    courseType: 'standard',
    maxStudents: 30,
    currentStudents: 0,
    startDate: null,
    endDate: null,
    settings: {},
    thumbnailUrl: null,
    tags: [],
    prerequisites: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'instructor-123',
    updatedBy: 'instructor-123',
    ...overrides,
  }),

  createMockEnrollment: (overrides: any = {}) => ({
    id: 'enrollment-123',
    courseId: 'course-123',
    studentId: 'student-123',
    status: 'active',
    enrollmentType: 'self_enrolled',
    enrolledAt: new Date(),
    approvedAt: null,
    completedAt: null,
    withdrawnAt: null,
    metadata: {},
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'student-123',
    updatedBy: 'student-123',
    ...overrides,
  }),

  createMockAssignment: (overrides: any = {}) => ({
    id: 'assignment-123',
    courseId: 'course-123',
    title: 'Test Assignment',
    description: 'A test assignment',
    // 'active' is not a member of ReactoryClassroomAssignmentStatus
    // (draft/published/closed/archived) - it was never a valid value here.
    assignmentType: 'essay',
    status: 'draft',
    requirements: {},
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    maxPoints: 100,
    gradingRubric: null,
    allowLateSubmissions: true,
    latePenaltyPercentage: 0,
    maxLateDays: 0,
    isRequired: true,
    orderIndex: 0,
    attachments: [],
    calendarEventId: null,
    publishedAt: null,
    autoPublishAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'instructor-123',
    updatedBy: 'instructor-123',
    ...overrides,
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

  /**
   * Mirrors the real ReactoryClassroomProgress entity.
   *
   * The previous shape used field names that exist on no entity (`percentComplete`,
   * `assignmentsCompleted`, `assignmentsTotal`, `status`), so services reading
   * `progressPercentage` / `activitiesCompleted` / `totalActivities` / `isCompleted` saw
   * undefined throughout. It also returned a bare object, while the service calls the
   * entity's own `recordActivity()` - which failed with "is not a function".
   */
  createMockProgress: (overrides: any = {}) => {
    const progress: any = {
      id: 'progress-123',
      enrollmentId: 'enrollment-123',
      progressPercentage: 45,
      activitiesCompleted: 3,
      totalActivities: 8,
      timeSpentMinutes: 120,
      lastActivityAt: new Date(),
      completedAt: null,
      isCompleted: false,
      metrics: { activities: [] },
      certificateUrl: null,
      certificateIssuedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'student-123',
      updatedBy: 'student-123',
      ...overrides,
    };

    progress.calculateProgressPercentage = function calculateProgressPercentage() {
      this.progressPercentage = this.totalActivities > 0
        ? (this.activitiesCompleted / this.totalActivities) * 100
        : 0;
      if (this.progressPercentage >= 100 && !this.isCompleted) {
        this.isCompleted = true;
        this.completedAt = new Date();
      }
    };

    progress.recordActivity = function recordActivity(activityType: string, activityData: any = {}) {
      this.activitiesCompleted += 1;
      this.lastActivityAt = new Date();
      if (!this.metrics) this.metrics = {};
      if (!this.metrics.activities) this.metrics.activities = [];
      this.metrics.activities.push({ type: activityType, data: activityData, timestamp: new Date() });
      if (activityData?.timeSpentMinutes) {
        this.timeSpentMinutes += activityData.timeSpentMinutes;
      }
      this.calculateProgressPercentage();
    };

    return progress;
  },
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