import { Repository } from "typeorm";
import { ReactoryCalendar } from "@reactory/server-modules/reactory-core/models/ReactoryCalendar";
import { PostgresDataSource } from "@reactory/server-modules/reactory-core/models";
import { service } from "@reactory/server-core/application/decorators/service";
import { Server } from "@reactory/reactory-core";
import { Models } from '@reactory/reactory-core';

export interface CreateReactoryCalendarInput {
  name: string;
  description?: string;
  color?: string;
  visibility: Reactory.Models.ReactoryCalendarVisibility;
  clientId?: string;
  organizationId?: string;
  businessUnitId?: string;
  timeZone?: string;
  workingHours?: Reactory.Models.ReactoryCalendarWorkingHours;
  settings?: Reactory.Models.ReactoryCalendarSettings;
}

export interface UpdateReactoryCalendarInput {
  name?: string;
  description?: string;
  color?: string;
  visibility?: Reactory.Models.ReactoryCalendarVisibility;
  timeZone?: string;
  workingHours?: Reactory.Models.ReactoryCalendarWorkingHours;
  settings?: Reactory.Models.ReactoryCalendarSettings;
  isActive?: boolean;
}

@service({
  id: 'reactory.CalendarService@1.0.0',
  name: 'ReactoryCalendarService',
  nameSpace: 'reactory',
  version: '1.0.0',
  description: 'Service for managing Reactory Calendars',
  serviceType: 'calendar',
  lifeCycle: 'instance'
})
export class ReactoryCalendarService implements Reactory.Service.IReactoryDefaultService {
  name: string;
  nameSpace: string;
  version: string;
  description: string;
  serviceType: string;
  lifeCycle: string;
  props: any;
  context: Reactory.Server.IReactoryContext;
  private calendarRepository: Repository<ReactoryCalendar>;
  
  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
    this.calendarRepository = PostgresDataSource.getRepository(ReactoryCalendar);
  }
  onStartup(context: Reactory.Server.IReactoryContext): Promise<void> {
    return Promise.resolve();
  }
  tags?: string[];
  toString?(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}@${this.version}`;
  }
  getExecutionContext(): Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Server.IReactoryContext): void {
    this.context = executionContext;
  }
  /**
   * Create a new calendar
   */
  async createCalendar(input: CreateReactoryCalendarInput, ownerId: string): Promise<ReactoryCalendar> {
    const calendar = this.calendarRepository.create({
      ...input,
      ownerId,
      createdBy: ownerId,
      updatedBy: ownerId,
      isActive: true,
      timeZone: input.timeZone || 'UTC',
      settings: input.settings || {},
      workingHours: input.workingHours || {}
    });

    return await this.calendarRepository.save(calendar);
  }

  /**
   * Update an existing calendar
   */
  async updateCalendar(id: number, input: UpdateReactoryCalendarInput, userId: string): Promise<ReactoryCalendar> {
    const calendar = await this.calendarRepository.findOne({ where: { id } });
    if (!calendar) {
      throw new Error(`Calendar with id ${id} not found`);
    }

    // Check permissions
    if (!(await this.checkCalendarAccess(id, userId, 'write'))) {
      throw new Error('Insufficient permissions to update calendar');
    }

    Object.assign(calendar, {
      ...input,
      updatedBy: userId,
      updatedAt: new Date()
    });

    return await this.calendarRepository.save(calendar);
  }

  /**
   * Delete a calendar (soft delete by setting inactive)
   */
  async deleteCalendar(id: number, userId: string): Promise<boolean> {
    const calendar = await this.calendarRepository.findOne({ where: { id } });
    if (!calendar) {
      throw new Error(`Calendar with id ${id} not found`);
    }

    // Only owner can delete calendar
    if (calendar.ownerId !== userId) {
      throw new Error('Only calendar owner can delete the calendar');
    }

    calendar.isActive = false;
    calendar.updatedBy = userId;
    calendar.updatedAt = new Date();

    await this.calendarRepository.save(calendar);
    return true;
  }

  /**
   * Get a calendar by ID
   */
  async getCalendar(id: number, userId?: string): Promise<ReactoryCalendar | null> {
    const calendar = await this.calendarRepository.findOne({ where: { id, isActive: true } });
    if (!calendar) return null;

    // Check access if userId provided
    if (userId && !(await this.checkCalendarAccess(id, userId, 'read'))) {
      return null;
    }

    return calendar;
  }

  /**
   * List calendars with filtering
   */
  async listCalendars(filter: Reactory.Models.ReactoryCalendarFilter = {}, userId?: string): Promise<ReactoryCalendar[]> {
    const query = this.calendarRepository.createQueryBuilder('calendar')
      .where('calendar.is_active = :isActive', { isActive: true });

    // Apply filters
    if (filter.visibility && filter.visibility.length > 0) {
      query.andWhere('calendar.visibility IN (:...visibility)', { visibility: filter.visibility });
    }

    if (filter.ownerId) {
      query.andWhere('calendar.owner_id = :ownerId', { ownerId: filter.ownerId });
    }

    if (filter.organizationId) {
      query.andWhere('calendar.organization_id = :organizationId', { organizationId: filter.organizationId });
    }

    if (filter.clientId) {
      query.andWhere('calendar.client_id = :clientId', { clientId: filter.clientId });
    }

    if (filter.search) {
      query.andWhere('(calendar.name ILIKE :search OR calendar.description ILIKE :search)', {
        search: `%${filter.search}%`
      });
    }

    // Apply user access control if userId provided
    if (userId) {
      query.andWhere(
        new (await import("typeorm")).Brackets(qb => {
          qb.where('calendar.owner_id = :userId', { userId })
            .orWhere('calendar.allowed_user_ids @> :userArray', { userArray: [userId] })
            .orWhere('calendar.visibility = :public', { public: Models.ReactoryCalendarVisibility.PUBLIC })
            .orWhere('calendar.visibility = :organization', { organization: Models.ReactoryCalendarVisibility.ORGANIZATION });
        })
      );
    }

    // Apply pagination
    if (filter.limit) {
      query.limit(filter.limit);
    }
    if (filter.offset) {
      query.offset(filter.offset);
    }

    query.orderBy('calendar.created_at', 'DESC');

    return await query.getMany();
  }

  /**
   * Share calendar with permissions
   */
  async shareCalendar(id: number, permissions: Reactory.Models.ReactoryCalendarPermissions, userId: string): Promise<ReactoryCalendar> {
    const calendar = await this.calendarRepository.findOne({ where: { id } });
    if (!calendar) {
      throw new Error(`Calendar with id ${id} not found`);
    }

    // Only owner or admin can share calendar
    if (calendar.ownerId !== userId) {
      throw new Error('Only calendar owner can manage sharing permissions');
    }

    calendar.allowedUserIds = permissions.userPermissions?.map(p => p.userId) || [];
    calendar.allowedTeamIds = permissions.teamPermissions?.map(p => p.teamId) || [];
    calendar.updatedBy = userId;
    calendar.updatedAt = new Date();

    return await this.calendarRepository.save(calendar);
  }

  /**
   * Get user's calendars
   */
  async getUserCalendars(userId: string, includeShared: boolean = true): Promise<ReactoryCalendar[]> {
    return await ReactoryCalendar.findUserCalendars(userId);
  }

  /**
   * Check calendar access permissions
   */
  async checkCalendarAccess(calendarId: number, userId: string, action: 'read' | 'write' | 'admin' = 'read'): Promise<boolean> {
    const calendar = await this.calendarRepository.findOne({ where: { id: calendarId, isActive: true } });
    if (!calendar) return false;

    // Owner has full access
    if (calendar.ownerId === userId) return true;

    // Check visibility-based access
    switch (calendar.visibility) {
      case Models.ReactoryCalendarVisibility.PRIVATE:
        return false; // Only owner has access

      case Models.ReactoryCalendarVisibility.SHARED:
        return calendar.allowedUserIds?.includes(userId) || false;

      case Models.ReactoryCalendarVisibility.APPLICATION:
        // Would need to check if user belongs to the application
        return calendar.allowedUserIds?.includes(userId) || false;

      case Models.ReactoryCalendarVisibility.ORGANIZATION:
        // Would need to check if user belongs to the organization
        return calendar.allowedUserIds?.includes(userId) || false;

      case Models.ReactoryCalendarVisibility.PUBLIC:
        return action === 'read'; // Public calendars are read-only for non-owners

      default:
        return false;
    }
  }

  /**
   * Get user's default calendar
   */
  async getUserDefaultCalendar(userId: string): Promise<ReactoryCalendar | null> {
    return await ReactoryCalendar.findDefaultCalendar(userId);
  }

  /**
   * Set user's default calendar
   */
  async setUserDefaultCalendar(calendarId: number, userId: string): Promise<ReactoryCalendar> {
    // First, unset any existing default calendar for this user
    await this.calendarRepository.update(
      { ownerId: userId, isDefault: true },
      { isDefault: false, updatedBy: userId, updatedAt: new Date() }
    );

    // Set the new default calendar
    const calendar = await this.calendarRepository.findOne({ where: { id: calendarId, ownerId: userId } });
    if (!calendar) {
      throw new Error('Calendar not found or not owned by user');
    }

    calendar.isDefault = true;
    calendar.updatedBy = userId;
    calendar.updatedAt = new Date();

    return await this.calendarRepository.save(calendar);
  }

  /**
   * Get organization calendars
   */
  async getOrganizationCalendars(organizationId: string, userId?: string): Promise<ReactoryCalendar[]> {
    const calendars = await ReactoryCalendar.findOrganizationCalendars(organizationId);

    // Filter by user access if userId provided
    if (userId) {
      return calendars.filter(calendar => this.checkCalendarAccess(calendar.id, userId, 'read'));
    }

    return calendars;
  }

  /**
   * Get client calendars
   */
  async getClientCalendars(clientId: string, userId?: string): Promise<ReactoryCalendar[]> {
    const calendars = await ReactoryCalendar.findClientCalendars(clientId);

    // Filter by user access if userId provided
    if (userId) {
      return calendars.filter(calendar => this.checkCalendarAccess(calendar.id, userId, 'read'));
    }

    return calendars;
  }
}