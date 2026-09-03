import mongoose from 'mongoose';
import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import TaskModel, { ITaskDocument } from '../../models/Task';
import { IReactoryWorkflowService } from '../../services/Workflow/types';

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

    // Mark task as completed
    task.status = 'completed';
    task.percentComplete = 100;
    task.completionDate = new Date();
    task.resultData = params.resultData;
    task.updatedAt = new Date();
    await task.save();

    let signalResult = null;
    // If associated with a workflow instance, signal and resume it
    if (task.instanceId) {
      try {
        const workflowService = getWorkflowService(context);
        signalResult = await workflowService.signalWorkflowInstance(
          task.instanceId,
          params.resultData,
          task.stepId
        );
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
