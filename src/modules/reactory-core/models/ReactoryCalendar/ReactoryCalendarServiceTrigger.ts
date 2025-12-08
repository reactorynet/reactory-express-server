import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from "typeorm";

@Entity({ name: 'reactory_calendar_service_trigger' })
// Indexes for trigger queries
@Index(['entryId', 'triggerType']) // Triggers by entry and type
@Index(['serviceId', 'serviceVersion']) // Service-specific triggers
export class ReactoryCalendarServiceTrigger extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entry_id', type: 'integer', nullable: false })
  @Index()
  entryId: number;

  @Column({ name: 'service_id', type: 'varchar', nullable: false })
  serviceId: string;

  @Column({ name: 'service_version', type: 'varchar', nullable: false })
  serviceVersion: string;

  @Column({ type: 'varchar', nullable: false })
  method: string;

  @Column({
    name: 'trigger_type',
    type: 'enum',
    enum: ['on_create', 'on_update', 'on_delete', 'time_based', 'participant_response'],
    nullable: false
  })
  triggerType: Reactory.Models.ReactoryCalendarServiceTriggerType;

  @Column({ name: 'trigger_offset', type: 'integer', nullable: true })
  triggerOffset?: number; // minutes before/after event

  @Column({ type: 'json', nullable: true })
  parameters: Record<string, any>;

  // Virtual properties populated by service layer
  entry?: any; // Populated from PostgreSQL ReactoryCalendarEntry

  // Helper methods for trigger management
  static findEntryTriggers(entryId: number) {
    return this.find({
      where: { entryId },
      order: { triggerType: 'ASC' }
    });
  }

  static findTimeBasedTriggers() {
    return this.find({
      where: { triggerType: Reactory.Models.ReactoryCalendarServiceTriggerType.TIME_BASED }
    });
  }

  static findServiceTriggers(serviceId: string, serviceVersion?: string) {
    const where: any = { serviceId };
    if (serviceVersion) {
      where.serviceVersion = serviceVersion;
    }
    return this.find({ where });
  }

  static removeEntryTriggers(entryId: number) {
    return this.delete({ entryId });
  }

  static createTrigger(entryId: number, triggerData: {
    serviceId: string;
    serviceVersion: string;
    method: string;
    triggerType: Reactory.Models.ReactoryCalendarServiceTriggerType;
    triggerOffset?: number;
    parameters?: Record<string, any>;
  }) {
    return this.create({
      entryId,
      ...triggerData
    });
  }
}