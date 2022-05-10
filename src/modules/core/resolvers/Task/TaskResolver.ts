import Reactory from '@reactory/reactory-core';
import users from 'data/users';
import { resolver, property, mutation, query } from "models/graphql/decorators/resolver";
import { ObjectId } from 'mongodb';

const Task = "Task"

@resolver
class TaskResolver {
  resolver: any

  @property(Task, "id")
  id(task: { _id: any }) {
    return task._id;
  }

  @property(Task, "description")
  description(task: { description: any }) {
    return task.description || "not set";
  }

  @property(Task, "assignedTo")
  user(task: Reactory.TReactoryTask, params: any, context: Reactory.Server.IReactoryContext) {
    //return User.findById(task.user);
    const userSvc: Reactory.Service.IReactoryUserService = context.getService("core.UserService@1.0.0");
    if(userSvc) {
      if(task.assignedTo && ObjectId.isValid(task.assignedTo as string | ObjectId) === true) {
        return userSvc.findUserById(task.assignedTo as string | ObjectId)
      }
      
      if(task.assignedTo && (task.assignedTo as Reactory.IUserDocument)._id) {
        return task.assignedTo;
      }
    }

    return null;
  }

  @property(Task, "comments")
  async comments(): Promise<any[]> {
    return Promise.resolve([]);    
  }

  @property(Task, "dueDate")
  dueDate(task: { dueDate: any }): Date | null { return task.dueDate || null }

  @property(Task, "startDate")
  startDate(task: { startDate: any }):Date {return task.startDate || null }
  
  @property(Task, "createdAt")
  createdAt(task: { createdAt: any }): Date {
    return task.createdAt || new Date();
  }

  @property(Task, "updatedAt")
  updatedAt(task: { updatedAt: any }) {
    return task.updatedAt || new Date();
  }
}

export default TaskResolver;