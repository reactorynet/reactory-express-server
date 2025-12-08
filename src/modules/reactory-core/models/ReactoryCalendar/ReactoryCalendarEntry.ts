import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, BaseEntity } from "typeorm";
import { Brackets } from "typeorm";
import { Models } from '@reactory/reactory-core'

@Entity({ name: 'reactory_calendar_entry' })
// Critical indexes for calendar performance
@Index(['calendarId', 'startDate', 'endDate']) // Date range queries
@Index(['organizerId', 'status']) // Organizer's events
@Index(['startDate', 'endDate']) // Global date filtering
@Index(['status', 'startDate']) // Active events
@Index(['calendarId', 'status', 'startDate']) // Calendar view queries
export class ReactoryCalendarEntry extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'calendar_id', type: 'integer', nullable: false })
  @Index()
  calendarId: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  location: string;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: false })
  @Index()
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: false })
  @Index()
  endDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: false })
  timeZone: string;

  @Column({ name: 'is_all_day', type: 'boolean', default: false })
  isAllDay: boolean;

  // Store recurrence as JSON for flexibility
  @Column({ type: 'json', nullable: true })
  recurrence: Reactory.Models.ReactoryCalendarRecurrencePattern;

  // Store as string ID - resolved in application layer
  @Column({ name: 'organizer_id', type: 'varchar', nullable: false })
  @Index()
  organizerId: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  })
  status: Reactory.Models.ReactoryCalendarEntryStatus;

  @Column({
    type: 'enum',
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  })
  priority: Reactory.Models.ReactoryCalendarEntryPriority;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  // Store attachment IDs as JSON array
  @Column({ name: 'attachment_ids', type: 'json', nullable: true })
  attachmentIds: string[];

  @Column({ type: 'json', nullable: true })
  workflowTrigger: Reactory.Models.ReactoryCalendarWorkflowTrigger;

  @Column({ type: 'json', nullable: true })
  serviceTrigger: Reactory.Models.ReactoryCalendarServiceTrigger;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', name: 'created_by', nullable: false })
  createdBy: string;

  @Column({ type: 'varchar', name: 'updated_by', nullable: false })
  updatedBy: string;

  // Virtual properties populated by service layer
  calendar?: any; // Populated from PostgreSQL
  organizer?: any; // Populated from MongoDB User
  attachments?: any[]; // Populated from MongoDB Attachments
  participants?: any[]; // Populated from PostgreSQL

  // Optimized query methods for calendar views
  static findInDateRange(calendarIds: number[], startDate: Date, endDate: Date, status?: Reactory.Models.ReactoryCalendarEntryStatus[]) {
    const query = this.createQueryBuilder('entry')
      .where('entry.calendar_id IN (:...calendarIds)', { calendarIds })
      .andWhere('entry.status != :cancelled', { cancelled: Models.ReactoryCalendarEntryStatus.CANCELLED })
      .andWhere(
        new Brackets(qb => {
          qb.where('entry.start_date <= :endDate', { endDate })
            .andWhere('entry.end_date >= :startDate', { startDate });
        })
      )
      .orderBy('entry.start_date', 'ASC');

    if (status && status.length > 0) {
      query.andWhere('entry.status IN (:...status)', { status });
    }

    return query.getMany();
  }

  static findUserEvents(userId: string, startDate: Date, endDate: Date, status?: Reactory.Models.ReactoryCalendarEntryStatus[]) {
    const query = this.createQueryBuilder('entry')
      .innerJoin('reactory_calendar_participant', 'participant',
        'participant.entry_id = entry.id AND participant.user_id = :userId', { userId })
      .where('entry.status != :cancelled', { cancelled: Models.ReactoryCalendarEntryStatus.CANCELLED })
      .andWhere('entry.start_date <= :endDate', { endDate })
      .andWhere('entry.end_date >= :startDate', { startDate })
      .orderBy('entry.start_date', 'ASC');

    if (status && status.length > 0) {
      query.andWhere('entry.status IN (:...status)', { status });
    }

    return query.getMany();
  }

  static findOrganizerEvents(organizerId: string, startDate?: Date, endDate?: Date, status?: Reactory.Models.ReactoryCalendarEntryStatus[]) {
    const query = this.createQueryBuilder('entry')
      .where('entry.organizer_id = :organizerId', { organizerId })
      .orderBy('entry.start_date', 'ASC');

    if (status && status.length > 0) {
      query.andWhere('entry.status IN (:...status)', { status });
    }

    if (startDate && endDate) {
      query.andWhere('entry.start_date <= :endDate', { endDate })
           .andWhere('entry.end_date >= :startDate', { startDate });
    }

    return query.getMany();
  }

  static findCalendarEvents(calendarId: number, startDate?: Date, endDate?: Date, status?: Reactory.Models.ReactoryCalendarEntryStatus[]) {
    const query = this.createQueryBuilder('entry')
      .where('entry.calendar_id = :calendarId', { calendarId })
      .orderBy('entry.start_date', 'ASC');

    if (status && status.length > 0) {
      query.andWhere('entry.status IN (:...status)', { status });
    }

    if (startDate && endDate) {
      query.andWhere('entry.start_date <= :endDate', { endDate })
           .andWhere('entry.end_date >= :startDate', { startDate });
    }

    return query.getMany();
  }

  static findConflictingEvents(calendarIds: number[], startDate: Date, endDate: Date, excludeEntryId?: number) {
    const query = this.createQueryBuilder('entry')
      .where('entry.calendar_id IN (:...calendarIds)', { calendarIds })
      .andWhere('entry.status = :confirmed', { confirmed: Models.ReactoryCalendarEntryStatus.CONFIRMED })
      .andWhere(
        new Brackets(qb => {
          qb.where('entry.start_date < :endDate', { endDate })
            .andWhere('entry.end_date > :startDate', { startDate });
        })
      );

    if (excludeEntryId) {
      query.andWhere('entry.id != :excludeId', { excludeId: excludeEntryId });
    }

    return query.getMany();
  }

  static findByTags(tags: string[], calendarIds?: number[]) {
    const query = this.createQueryBuilder('entry')
      .where('entry.tags @> :tags', { tags: JSON.stringify(tags) });

    if (calendarIds && calendarIds.length > 0) {
      query.andWhere('entry.calendar_id IN (:...calendarIds)', { calendarIds });
    }

    return query.getMany();
  }

  static searchEntries(searchTerm: string, calendarIds?: number[], limit: number = 50) {
    const query = this.createQueryBuilder('entry')
      .where('entry.title ILIKE :searchTerm OR entry.description ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`
      })
      .orderBy('entry.start_date', 'DESC')
      .limit(limit);

    if (calendarIds && calendarIds.length > 0) {
      query.andWhere('entry.calendar_id IN (:...calendarIds)', { calendarIds });
    }

    return query.getMany();
  }
}