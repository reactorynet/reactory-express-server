import { ClientKeyColumn } from '../../../../database/tenant/ClientKeyColumn';
import type { CalendarRepository } from './repository';
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, BaseEntity } from "typeorm";


@Entity({ name: 'reactory_calendar_participant' })
// Indexes for efficient participant queries
@Index(['entryId', 'userId']) // Unique participant per entry
@Index(['userId', 'status']) // User's event participation status
@Index(['entryId', 'status']) // Entry participant responses
@Index(['invitedAt']) // Recent invitations
export class ReactoryCalendarParticipant extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Owning ReactoryClient key (WP-B2); set by the tenant repository. */
  @ClientKeyColumn()
  clientKey: string;

  @Column({ name: 'entry_id', type: 'integer', nullable: false })
  @Index()
  entryId: number;

  @Column({ name: 'user_id', type: 'varchar', nullable: false })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['organizer', 'required', 'optional', 'resource'],
    default: 'optional'
  })
  role: Reactory.Models.ReactoryCalendarParticipantRole;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'tentative'],
    default: 'pending'
  })
  status: Reactory.Models.ReactoryCalendarRSVPStatus;

  @Column({ name: 'invited_at', type: 'timestamptz', nullable: false })
  invitedAt: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Virtual properties populated by service layer
  entry?: any; // Populated from PostgreSQL ReactoryCalendarEntry
  user?: any; // Populated from MongoDB User

  // Helper methods for participant management
  static findEntryParticipants(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number) {
    return repo.find({
      where: { entryId },
      order: { invitedAt: 'ASC' }
    });
  }

  static findUserParticipations(repo: CalendarRepository<ReactoryCalendarParticipant>, userId: string, status?: Reactory.Models.ReactoryCalendarRSVPStatus[]) {
    const query = repo.createQueryBuilder('participant')
      .where('participant.user_id = :userId', { userId })
      .orderBy('participant.invited_at', 'DESC');

    if (status && status.length > 0) {
      query.andWhere('participant.status IN (:...status)', { status });
    }

    return query.getMany();
  }

  static findPendingResponses(repo: CalendarRepository<ReactoryCalendarParticipant>, userId: string) {
    return repo.find({
      where: {
        userId,
        status: Reactory.Models.ReactoryCalendarRSVPStatus.PENDING
      },
      order: { invitedAt: 'ASC' }
    });
  }

  static findParticipantsByRole(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number, role: Reactory.Models.ReactoryCalendarParticipantRole) {
    return repo.find({
      where: { entryId, role }
    });
  }

  static countParticipantsByStatus(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number) {
    return repo.createQueryBuilder('participant')
      .select('participant.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('participant.entry_id = :entryId', { entryId })
      .groupBy('participant.status')
      .getRawMany();
  }

  static updateParticipantStatus(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number, userId: string, status: Reactory.Models.ReactoryCalendarRSVPStatus, notes?: string) {
    return repo.update(
      { entryId, userId },
      {
        status,
        respondedAt: new Date(),
        notes
      }
    );
  }

  static removeParticipant(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number, userId: string) {
    return repo.delete({ entryId, userId });
  }

  static addParticipants(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number, participants: Array<{
    userId: string;
    role: Reactory.Models.ReactoryCalendarParticipantRole;
    notes?: string;
  }>) {
    const now = new Date();
    const participantEntities = participants.map(participant => ({
      entryId,
      userId: participant.userId,
      role: participant.role,
      status: Reactory.Models.ReactoryCalendarRSVPStatus.PENDING,
      invitedAt: now,
      notes: participant.notes
    }));

    return repo.insert(participantEntities);
  }

  static isUserParticipant(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number, userId: string) {
    return repo.findOne({
      where: { entryId, userId }
    });
  }

  static findOrganizers(repo: CalendarRepository<ReactoryCalendarParticipant>, entryId: number) {
    return repo.find({
      where: {
        entryId,
        role: Reactory.Models.ReactoryCalendarParticipantRole.ORGANIZER
      }
    });
  }
}