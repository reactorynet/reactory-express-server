/**
 * TodoStep - Create and manage todo items within a workflow context
 *
 * Config shape (from YAML `inputs` JSON):
 *   action:       "create"              (required — one of create, update, list, get)
 *   listId:       "my-todo-list"        (required — identifies the todo list in workflow variables)
 *   name:         "todo-item-name"      (optional — unique name for the todo item, for create)
 *   todoId:       "todo-uuid"           (optional — todo item identifier, for update/get)
 *   title:        "Do something"        (for create/update — the todo item title)
 *   description:  "Details here"        (for create/update — the todo item description)
 *   status:       "pending"             (for create/update — one of pending, in_progress, completed, failed, cancelled)
 *   assignee:     "user@example.com"    (for create/update — assigned user)
 *
 * Todos are stored under `context.variables.__todos__{listId}` as an array.
 *
 * Output depends on action:
 *   create: { todo }
 *   update: { todo }
 *   list:   { todos, count }
 *   get:    { todo }
 */

import { BaseYamlStep } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/interfaces/IYamlStep';

/** Valid todo actions */
type TodoAction = 'create' | 'update' | 'list' | 'get';

/** Valid todo statuses */
type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Shape of a single todo item stored in workflow variables
 */
interface TodoItem {
  id: string;
  name: string;
  title: string;
  description: string;
  status: TodoStatus;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Configuration interface for TodoStep
 */
export interface TodoStepConfig {
  /** The action to perform */
  action: TodoAction;

  /** Identifies the todo list in workflow variables */
  listId: string;

  /** Unique name for the todo item (for create) */
  name?: string;

  /** Todo item identifier (for update/get) */
  todoId?: string;

  /** Todo item title */
  title?: string;

  /** Todo item description */
  description?: string;

  /** Todo item status */
  status?: TodoStatus;

  /** Assigned user (email or ID) */
  assignee?: string;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for creating and managing todo items within a YAML workflow
 */
export class TodoStep extends BaseYamlStep {
  public readonly stepType = 'todo';

  /**
   * Execute the todo management step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as TodoStepConfig;

    const resolvedListId = this.resolveTemplate(config.listId, context);
    const storageKey = `__todos__${resolvedListId}`;

    // Ensure the todo list exists in variables
    if (!context.variables[storageKey]) {
      context.variables[storageKey] = [];
    }

    const todos: TodoItem[] = context.variables[storageKey];

    context.logger.info(`Todo ${config.action} on list "${resolvedListId}"`);

    try {
      switch (config.action) {
        case 'create': {
          return this.handleCreate(config, todos, storageKey, resolvedListId, context);
        }

        case 'update': {
          return this.handleUpdate(config, todos, storageKey, resolvedListId, context);
        }

        case 'list': {
          return this.handleList(todos, resolvedListId, context);
        }

        case 'get': {
          return this.handleGet(config, todos, resolvedListId, context);
        }

        default:
          return {
            success: false,
            error: `Unsupported todo action: "${config.action}"`,
            outputs: {},
            metadata: { action: config.action, listId: resolvedListId },
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`Todo step failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: {},
        metadata: { action: config.action, listId: resolvedListId },
      };
    }
  }

  /**
   * Handle the 'create' action
   */
  private handleCreate(
    config: TodoStepConfig,
    todos: TodoItem[],
    storageKey: string,
    listId: string,
    context: StepExecutionContext,
  ): StepExecutionResult {
    const resolvedName = config.name
      ? this.resolveTemplate(config.name, context)
      : `todo_${Date.now()}`;
    const resolvedTitle = config.title
      ? this.resolveTemplate(config.title, context)
      : resolvedName;
    const resolvedDescription = config.description
      ? this.resolveTemplate(config.description, context)
      : '';
    const resolvedAssignee = config.assignee
      ? this.resolveTemplate(config.assignee, context)
      : null;

    const todoId = `${listId}_${resolvedName}_${Date.now()}`;
    const now = new Date().toISOString();

    const newTodo: TodoItem = {
      id: todoId,
      name: resolvedName,
      title: resolvedTitle,
      description: resolvedDescription,
      status: config.status || 'pending',
      assignee: resolvedAssignee,
      createdAt: now,
      updatedAt: now,
    };

    todos.push(newTodo);
    context.variables[storageKey] = todos;

    context.logger.info(`Created todo "${resolvedTitle}" (id: ${todoId}) in list "${listId}"`);

    return {
      success: true,
      outputs: { todo: newTodo },
      metadata: { action: 'create', listId, todoId, todoCount: todos.length },
    };
  }

  /**
   * Handle the 'update' action
   */
  private handleUpdate(
    config: TodoStepConfig,
    todos: TodoItem[],
    storageKey: string,
    listId: string,
    context: StepExecutionContext,
  ): StepExecutionResult {
    const resolvedTodoId = config.todoId
      ? this.resolveTemplate(config.todoId, context)
      : undefined;

    if (!resolvedTodoId) {
      return {
        success: false,
        error: 'todoId is required for update action',
        outputs: {},
        metadata: { action: 'update', listId },
      };
    }

    const todoIndex = todos.findIndex((t) => t.id === resolvedTodoId || t.name === resolvedTodoId);

    if (todoIndex === -1) {
      return {
        success: false,
        error: `Todo item "${resolvedTodoId}" not found in list "${listId}"`,
        outputs: {},
        metadata: { action: 'update', listId, todoId: resolvedTodoId },
      };
    }

    const existingTodo = todos[todoIndex];

    // Apply updates
    if (config.title) {
      existingTodo.title = this.resolveTemplate(config.title, context);
    }
    if (config.description) {
      existingTodo.description = this.resolveTemplate(config.description, context);
    }
    if (config.status) {
      existingTodo.status = config.status;
    }
    if (config.assignee !== undefined) {
      existingTodo.assignee = config.assignee
        ? this.resolveTemplate(config.assignee, context)
        : null;
    }
    existingTodo.updatedAt = new Date().toISOString();

    todos[todoIndex] = existingTodo;
    context.variables[storageKey] = todos;

    context.logger.info(
      `Updated todo "${existingTodo.title}" (id: ${existingTodo.id}) in list "${listId}"`,
    );

    return {
      success: true,
      outputs: { todo: existingTodo },
      metadata: { action: 'update', listId, todoId: existingTodo.id },
    };
  }

  /**
   * Handle the 'list' action
   */
  private handleList(
    todos: TodoItem[],
    listId: string,
    context: StepExecutionContext,
  ): StepExecutionResult {
    context.logger.info(`Listing ${todos.length} todo(s) in list "${listId}"`);

    return {
      success: true,
      outputs: { todos, count: todos.length },
      metadata: { action: 'list', listId, todoCount: todos.length },
    };
  }

  /**
   * Handle the 'get' action
   */
  private handleGet(
    config: TodoStepConfig,
    todos: TodoItem[],
    listId: string,
    context: StepExecutionContext,
  ): StepExecutionResult {
    const resolvedTodoId = config.todoId
      ? this.resolveTemplate(config.todoId, context)
      : undefined;

    if (!resolvedTodoId) {
      return {
        success: false,
        error: 'todoId is required for get action',
        outputs: {},
        metadata: { action: 'get', listId },
      };
    }

    const todo = todos.find((t) => t.id === resolvedTodoId || t.name === resolvedTodoId);

    if (!todo) {
      context.logger.warn(`Todo item "${resolvedTodoId}" not found in list "${listId}"`);
      return {
        success: true,
        outputs: { todo: null },
        metadata: { action: 'get', listId, todoId: resolvedTodoId, found: false },
      };
    }

    context.logger.info(`Found todo "${todo.title}" (id: ${todo.id}) in list "${listId}"`);

    return {
      success: true,
      outputs: { todo },
      metadata: { action: 'get', listId, todoId: todo.id, found: true },
    };
  }

  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validActions: TodoAction[] = ['create', 'update', 'list', 'get'];
    if (!config.action || !validActions.includes(config.action)) {
      errors.push(`action is required and must be one of: ${validActions.join(', ')}`);
    }

    if (!config.listId || typeof config.listId !== 'string') {
      errors.push('listId is required and must be a string');
    }

    // Action-specific validation
    if (config.action === 'create') {
      if (!config.title && !config.name) {
        warnings.push('Neither title nor name provided for create — a default name will be generated');
      }
    }

    if (config.action === 'update' || config.action === 'get') {
      if (!config.todoId || typeof config.todoId !== 'string') {
        errors.push('todoId is required for update and get actions and must be a string');
      }
    }

    if (config.action === 'update') {
      if (!config.title && !config.description && !config.status && config.assignee === undefined) {
        warnings.push('No fields to update — at least one of title, description, status, or assignee should be provided');
      }
    }

    const validStatuses: TodoStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
    if (config.status && !validStatuses.includes(config.status)) {
      errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }

    if (config.title && typeof config.title !== 'string') {
      errors.push('title must be a string');
    }

    if (config.description && typeof config.description !== 'string') {
      errors.push('description must be a string');
    }

    if (config.assignee && typeof config.assignee !== 'string') {
      errors.push('assignee must be a string');
    }

    if (config.name && typeof config.name !== 'string') {
      errors.push('name must be a string');
    }

    if (config.todoId && typeof config.todoId !== 'string') {
      errors.push('todoId must be a string');
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
