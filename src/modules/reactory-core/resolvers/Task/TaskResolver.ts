import mongoose from 'mongoose';
import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import TaskModel, { ITaskDocument } from '../../models/Task';
import { IReactoryWorkflowService } from '../../services/Workflow/types';
import { TASK_COMPLETED_EVENT } from '../../workflow/YamlFlow/steps/core/UserActivityStep';

const getWorkflowService = (context: Reactory.Server.IReactoryContext): IReactoryWorkflowService => {
  return context.getService('core.ReactoryWorkflowService@1.0.0') as IReactoryWorkflowService;
};

// @ts-ignore
@resolver
class TaskResolver {
  resolver: any;

  // QUERIES

  @roles(['USER'], 'args.context')
  @query('userTasks')
  async getUserTasks(
    obj: any,
    params: {
      status?: string;
      category?: string;
      page?: number;
      limit?: number;
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const filter: any = {
      user: new mongoose.Types.ObjectId(context.user._id),
    };

    if (params.status) {
      filter.status = params.status;
    }
    if (params.category) {
      filter.category = params.category;
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      TaskModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      TaskModel.countDocuments(filter).exec(),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @roles(['USER'], 'args.context')
  @query('userWorkflowTasks')
  async getUserWorkflowTasks(
    obj: any,
    params: {
      workflowId?: string;
      instanceId?: string;
      status?: string;
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const filter: any = {
      user: new mongoose.Types.ObjectId(context.user._id),
    };

    if (params.workflowId) {
      filter.workflowId = params.workflowId;
    }
    if (params.instanceId) {
      filter.instanceId = params.instanceId;
    }
    if (params.status) {
      filter.status = params.status;
    } else {
      // Default to pending / in-progress tasks awaiting user input
      filter.status = { $in: ['pending', 'in_progress', 'awaiting_input'] };
    }

    return TaskModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  @roles(['USER'], 'args.context')
  @query('task')
  async getTask(
    obj: any,
    params: { id: string },
    context: Reactory.Server.IReactoryContext
  ) {
    if (!params.id) return null;
    return TaskModel.findById(params.id).exec();
  }

  // MUTATIONS

  @roles(['USER'], 'args.context')
  @mutation('createTask')
  async createTask(
    obj: any,
    params: {
      input: {
        title: string;
        description?: string;
        category?: string;
        workflowStatus?: string;
        status?: string;
        workflowId?: string;
        instanceId?: string;
        stepId?: string;
        stepNumber?: number;
        componentFqn?: string;
        componentProps?: any;
        formSchemaId?: string;
        dueDate?: Date;
        startDate?: Date;
        label?: string[];
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const task = new TaskModel({
      ...params.input,
      user: context.user._id,
      status: params.input.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await task.save();

    // Publish AMQ event on workflow/tasks channel
    try {
      if (context.hasFeature && context.hasFeature('core.ReactoryAMQService')) {
        const amqService = context.getService('core.ReactoryAMQService@1.0.0') as any;
        if (amqService && amqService.publish) {
          amqService.publish('workflow', 'workflow.task.created', {
            taskId: task._id.toString(),
            workflowId: task.workflowId,
            instanceId: task.instanceId,
            stepId: task.stepId,
            userId: context.user._id.toString(),
          });
        }
      }
    } catch (e) {
      context.log(`Failed to publish AMQ event for task creation: ${e.message}`, { error: e }, 'warn', 'TaskResolver');
    }

    return task;
  }

  @roles(['USER'], 'args.context')
  @mutation('updateTask')
  async updateTask(
    obj: any,
    params: {
      id: string;
      input: {
        title?: string;
        description?: string;
        percentComplete?: number;
        category?: string;
        workflowStatus?: string;
        status?: string;
        dueDate?: Date;
        completionDate?: Date;
        resultData?: any;
        label?: string[];
      };
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const task = await TaskModel.findById(params.id).exec();
    if (!task) {
      throw new Error(`Task not found with ID: ${params.id}`);
    }

    Object.assign(task, params.input, { updatedAt: new Date() });
    await task.save();

    return task;
  }

  @roles(['USER'], 'args.context')
  @mutation('completeWorkflowTask')
  async completeWorkflowTask(
    obj: any,
    params: {
      taskId: string;
      resultData?: any;
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const task = await TaskModel.findById(params.taskId).exec();
    if (!task) {
      return {
        success: false,
        message: `Task not found with ID: ${params.taskId}`,
        task: null,
      };
    }

    // Mark task as completed. `completedBy` is taken from the AUTHENTICATED context,
    // never from the submitted payload: for an approval gate the approver's identity
    // is the audit trail, and a client-supplied one proves nothing.
    const completedBy = (context.user as any)?._id;
    const completedByEmail = (context.user as any)?.email;

    task.status = 'completed';
    task.percentComplete = 100;
    task.completionDate = new Date();
    task.resultData = params.resultData;
    task.completedBy = completedBy;
    task.completedByEmail = completedByEmail;
    task.updatedAt = new Date();
    await task.save();

    // The payload delivered to the resumed workflow step. The submitted resultData is
    // merged UNDER the server-stamped identity so a client cannot spoof the approver.
    const resumePayload = {
      ...(params.resultData && typeof params.resultData === 'object' ? params.resultData : {}),
      completedBy: completedBy ? String(completedBy) : undefined,
      completedByEmail,
      completedAt: task.completionDate.toISOString(),
      taskId: task._id.toString(),
    };

    let signalResult = null;
    // Resume the workflow that raised this task.
    //
    // The event is correlated by TASK ID, which is what the user_activity step
    // suspends on. Signalling by step id cannot be relied on: the engine stamps
    // pointer.stepName with the step's NAME when it has one, so a named step is
    // unmatchable by its YAML id, and one instance may hold several tasks at once.
    //
    // The tenant matters too — event subscriptions are matched strictly by tenant,
    // so publishing under the caller's partner would silently wake nothing whenever
    // the instance runs under a different one. publishWorkflowEvent resolves it from
    // the instance when we hand it the id.
    if (task.instanceId) {
      try {
        const workflowService = getWorkflowService(context);
        const instance = await workflowService.getWorkflowHistoryById(task.instanceId);
        const tenantId = (instance as any)?.tenantId || undefined;

        signalResult = await workflowService.publishWorkflowEvent(
          TASK_COMPLETED_EVENT,
          task._id.toString(),
          resumePayload,
          tenantId
        );

        // Legacy path: tasks raised before the task-id correlation existed are woken
        // by matching the waiting pointer. It is a no-op when nothing matches, so it
        // is safe to attempt after the publish above.
        if (signalResult && (signalResult as any).success === false) {
          signalResult = await workflowService.signalWorkflowInstance(
            task.instanceId,
            resumePayload,
            task.stepId
          );
        }
      } catch (err: any) {
        context.log(`Error signalling workflow instance ${task.instanceId}`, { error: err }, 'error', 'TaskResolver');
      }
    }

    // Publish AMQ event on workflow channel
    try {
      if (context.hasFeature && context.hasFeature('core.ReactoryAMQService')) {
        const amqService = context.getService('core.ReactoryAMQService@1.0.0') as any;
        if (amqService && amqService.publish) {
          amqService.publish('workflow', 'workflow.task.completed', {
            taskId: task._id.toString(),
            workflowId: task.workflowId,
            instanceId: task.instanceId,
            stepId: task.stepId,
            userId: context.user._id.toString(),
            resultData: params.resultData,
            completedBy: completedBy ? String(completedBy) : undefined,
          });
        }
      }
    } catch (e) {
      // Non-critical AMQ logging
    }

    return {
      success: true,
      message: 'Workflow task completed and workflow signaled successfully',
      task,
      signalResult,
    };
  }

  @roles(['USER'], 'args.context')
  @mutation('deleteTask')
  async deleteTask(
    obj: any,
    params: { id: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const task = await TaskModel.findById(params.id).exec();
    if (!task) {
      return { success: false, message: `Task not found with ID: ${params.id}` };
    }

    await TaskModel.findByIdAndDelete(params.id).exec();
    return { success: true, message: 'Task deleted successfully' };
  }

  // PROPERTY RESOLVERS

  @property('Task', 'id')
  taskId(obj: any) {
    return obj._id ? obj._id.toString() : obj.id;
  }

  @property('Task', 'user')
  async taskUser(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    if (!obj.user) return null;
    if (typeof obj.user === 'object' && obj.user.email) return obj.user;

    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
    if (userService) {
      return userService.findUserById(obj.user);
    }
    return null;
  }
}

export default TaskResolver;
