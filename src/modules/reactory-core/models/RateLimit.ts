import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'reactory_rate_limits' })
@Index(['key', 'windowStart'])
export default class RateLimitModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  key: string;

  @Column({ type: 'int', default: 0 })
  count: number;

  @Column({ type: 'bigint' })
  windowStart: number;

  @Column({ type: 'bigint' })
  windowEnd: number;

  @Column({ type: 'int', default: 0 })
  maxAttempts: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  identifierType: string; // 'ip', 'user', 'email'

  @Column({ type: 'varchar', length: 255, nullable: true })
  identifier: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
