**Title:** Add @workflow TypeScript Annotation

**Type:** Task

**Priority:** High

**Reporter:** [Your Name]

**Assignee:** [Assignee Name]

**Description:**

We need to add a `@workflow` TypeScript annotation that can be added to any TypeScript class. This annotation should require a fully qualified name (FQN) in the format `{nameSpace}.{name}@{version}`. The class should be registered in the workflow registry during system startup.

**Acceptance Criteria:**

1. The `@workflow` annotation can be added to any TypeScript class.
2. The annotation requires a FQN in the specified format.
3. The class is registered in the workflow registry during system startup.
4. Proper error handling is in place for incorrect FQN formats and failed registrations.

**Sub-Tasks:**

1. Research how to implement custom TypeScript annotations.
2. Implement the `@workflow` annotation in a feature branch.
3. Write unit and integration tests for the annotation.
4. Test the annotation and the registration process.
5. Review and merge the feature branch into the main branch.
6. Update internal and user-facing documentation to reflect the new annotation.

**Suggested Solutions:**

1. **Use Decorators:** TypeScript supports decorators, which can be used to create the `@workflow` annotation.
2. **Use Reflection:** You could use reflection to get the metadata of the class during system startup and register it in the workflow registry.
3. **Use a Library:** Consider using a library like `reflect-metadata` to simplify the implementation.

**Labels:** `TypeScript`, `Annotation`, `Workflow`, `Registry`

**Due Date:** [Due Date]

**Sources:**

**reactory-server-express/src/server.ts**: Main server entry point. This file could be updated to include the registration process during system startup.
**reactory-server-express/src/workflowRegistry.ts**: Workflow registry. This file could be updated to handle the registration of classes with the `@workflow` annotation.

**Comments:**