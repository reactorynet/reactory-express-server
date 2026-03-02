import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * UserSession - Long-lived record of JWT sessions issued to users.
 *
 * Stored in PostgreSQL via TypeORM. While the in-flight session list lives on
 * the MongoDB User document (sessionInfo[]), this table keeps a durable
 * historical log that survives token expiry / revocation.
 */
@Entity({ name: 'reactory_user_sessions' })
@Index(['userId', 'createdAt'])
@Index(['email', 'createdAt'])
@Index(['sessionId'], { unique: true })
@Index(['status', 'expiresAt'])
export default class UserSession {

  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Unique session identifier (UUID). Matches the `id` field in User.sessionInfo[].
   */
  @Column({ type: 'varchar', length: 255, nullable: false, name: 'session_id' })
  sessionId!: string;

  /**
   * MongoDB ObjectId string of the user this session belongs to.
   */
  @Column({ type: 'varchar', length: 255, nullable: false, name: 'user_id' })
  userId!: string;

  /**
   * Email of the user at the time the session was created (denormalised for
   * efficient querying / pattern matching).
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  email!: string;

  /**
   * Host / IP address that requested the token.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  host!: string;

  /**
   * ReactoryClient key (or 'system' / 'cli') that was used when creating the session.
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'client_key' })
  clientKey!: string;

  /**
   * JWT issuer claim.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  issuer!: string;

  /**
   * JWT subject claim.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  subject!: string;

  /**
   * JWT audience claim.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  audience!: string;

  /**
   * Refresh token UUID embedded in the JWT payload.
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'refresh_token' })
  refreshToken!: string;

  /**
   * Timestamp (epoch ms) when the token was issued.
   */
  @Column({ type: 'bigint', nullable: true, name: 'issued_at' })
  issuedAt!: number;

  /**
   * Timestamp (epoch ms) when the token expires.
   */
  @Column({ type: 'bigint', nullable: true, name: 'expires_at' })
  expiresAt!: number;

  /**
   * Token lifetime category that was used to create this session.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  lifetime!: string; // 'short' | 'standard' | 'long' | 'custom'

  /**
   * Session status.
   *   - 'active'  — session was created and has not been explicitly revoked
   *   - 'expired' — session passed its JWT expiry time (set lazily or via cron)
   *   - 'revoked' — session was explicitly revoked via expireTokens()
   */
  @Column({ type: 'varchar', length: 50, nullable: false, default: 'active' })
  status!: string;

  /**
   * Timestamp when the session was revoked (null if not revoked).
   */
  @Column({ type: 'timestamp', nullable: true, name: 'revoked_at' })
  revokedAt!: Date;

  /**
   * Reason for revocation (e.g. 'user_request', 'admin_action', 'pattern_match').
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'revocation_reason' })
  revocationReason!: string;

  /**
   * The identity (userId) of whoever revoked the session; null for self-service.
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'revoked_by' })
  revokedBy!: string;

  /**
   * Optional user agent string at session creation time.
   */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent!: string;

  /**
   * Optional IP address at session creation time.
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ip_address' })
  ipAddress!: string;

  /**
   * JSON blob for any additional metadata we want to persist.
   */
  @Column({ type: 'text', nullable: true })
  metadata!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;
}
