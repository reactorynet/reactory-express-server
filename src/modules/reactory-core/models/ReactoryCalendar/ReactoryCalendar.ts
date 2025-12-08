import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, BaseEntity } from "typeorm";
import { Brackets } from "typeorm";


@Entity({ name: 'reactory_calendar' })
// Performance indexes for high-read queries
@Index(['ownerId', 'visibility', 'isActive'])
@Index(['clientId', 'visibility', 'isActive'])
@Index(['organizationId', 'visibility', 'isActive'])
@Index(['isActive', 'createdAt'])
@Index(['ownerId', 'isDefault']) // Quick user default calendar lookup
export class ReactoryCalendar extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 7, nullable: true }) // hex color code
  color: string;

  @Column({
    type: 'enum',
    enum: ['private', 'shared', 'application', 'organization', 'public'],
    default: 'private'
  })
  visibility: Reactory.Models.ReactoryCalendarVisibility;

  // Store as string IDs - relationships resolved in application layer
  @Column({ name: 'owner_id', type: 'varchar', nullable: false })
  @Index()
  ownerId: string;

  @Column({ name: 'client_id', type: 'varchar', nullable: true })
  @Index()
  clientId: string;

  @Column({ name: 'organization_id', type: 'varchar', nullable: true })
  @Index()
  organizationId: string;

  @Column({ name: 'business_unit_id', type: 'varchar', nullable: true })
  businessUnitId: string;

  // Store as JSON arrays for flexible permission management
  @Column({ name: 'allowed_user_ids', type: 'json', nullable: true })
  allowedUserIds: string[];

  @Column({ name: 'allowed_team_ids', type: 'json', nullable: true })
  allowedTeamIds: string[];

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ length: 50, default: 'UTC' })
  timeZone: string;

  @Column({ type: 'json', nullable: true })
  workingHours: Reactory.Models.ReactoryCalendarWorkingHours;

  @Column({ type: 'json', nullable: true })
  settings: Reactory.Models.ReactoryCalendarSettings;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: false })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', nullable: false })
  updatedBy: string;

  // Virtual properties populated by service layer
  owner?: any; // Populated from MongoDB User
  client?: any; // Populated from MongoDB ReactoryClient
  organization?: any; // Populated from MongoDB Organization
  businessUnit?: any; // Populated from MongoDB BusinessUnit
  allowedUsers?: any[]; // Populated from MongoDB Users
  allowedTeams?: any[]; // Populated from MongoDB Teams

  // Helper methods for common queries
  static findUserCalendars(userId: string, visibility?: Reactory.Models.ReactoryCalendarVisibility) {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.is_active = :isActive', { isActive: true })
      .andWhere(
        new Brackets(qb => {
          qb.where('calendar.owner_id = :userId', { userId })
            .orWhere('calendar.allowed_user_ids @> :userArray', { userArray: [userId] })
            .orWhere('calendar.visibility = :public', { public: Reactory.Models.ReactoryCalendarVisibility.PUBLIC })
            .orWhere('calendar.visibility = :organization', { organization: Reactory.Models.ReactoryCalendarVisibility.ORGANIZATION });
        })
      );

    if (visibility) {
      query.andWhere('calendar.visibility = :visibility', { visibility });
    }

    return query.getMany();
  }

  static findDefaultCalendar(userId: string) {
    return this.findOne({
      where: {
        ownerId: userId,
        isDefault: true,
        isActive: true
      }
    });
  }

  static findOrganizationCalendars(organizationId: string, visibility?: Reactory.Models.ReactoryCalendarVisibility) {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.is_active = :isActive', { isActive: true })
      .andWhere('calendar.organization_id = :organizationId', { organizationId });

    if (visibility) {
      query.andWhere('calendar.visibility = :visibility', { visibility });
    }

    return query.getMany();
  }

  static findClientCalendars(clientId: string, visibility?: Reactory.Models.ReactoryCalendarVisibility) {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.is_active = :isActive', { isActive: true })
      .andWhere('calendar.client_id = :clientId', { clientId });

    if (visibility) {
      query.andWhere('calendar.visibility = :visibility', { visibility });
    }

    return query.getMany();
  }
}