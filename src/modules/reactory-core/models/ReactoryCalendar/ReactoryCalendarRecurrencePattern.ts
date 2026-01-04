import { Entity, PrimaryGeneratedColumn, Column, Index, BaseEntity } from "typeorm";


@Entity({ name: 'reactory_calendar_recurrence_pattern' })
// Indexes for recurrence pattern queries
@Index(['frequency', 'interval']) // Common recurrence patterns
export class ReactoryCalendarRecurrencePattern extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    nullable: false
  })
  frequency: Reactory.Models.ReactoryCalendarRecurrenceFrequency;

  @Column({ type: 'integer', default: 1 })
  interval: number;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate?: Date;

  @Column({ type: 'integer', nullable: true })
  count?: number;

  // e.g., ['MO', 'WE', 'FR'] for weekly recurrence
  @Column({ name: 'by_day', type: 'json', nullable: true })
  byDay?: string[];

  // e.g., [1, 3, 12] for monthly recurrence
  @Column({ name: 'by_month', type: 'json', nullable: true })
  byMonth?: number[];

  // e.g., [1, 15, -1] for monthly recurrence (1st, 15th, last day)
  @Column({ name: 'by_month_day', type: 'json', nullable: true })
  byMonthDay?: number[];

  // Dates to exclude from recurrence
  @Column({ type: 'json', nullable: true })
  exceptions?: Date[];

  // Helper methods for recurrence calculations
  static createDaily(interval: number = 1, endDate?: Date, count?: number) {
    return this.create({
      frequency: Reactory.Models.ReactoryCalendarRecurrenceFrequency.DAILY,
      interval,
      endDate,
      count
    });
  }

  static createWeekly(interval: number = 1, byDay?: string[], endDate?: Date, count?: number) {
    return this.create({
      frequency: Reactory.Models.ReactoryCalendarRecurrenceFrequency.WEEKLY,
      interval,
      byDay,
      endDate,
      count
    });
  }

  static createMonthly(interval: number = 1, byMonthDay?: number[], endDate?: Date, count?: number) {
    return this.create({
      frequency: Reactory.Models.ReactoryCalendarRecurrenceFrequency.MONTHLY,
      interval,
      byMonthDay,
      endDate,
      count
    });
  }

  static createYearly(interval: number = 1, byMonth?: number[], byMonthDay?: number[], endDate?: Date, count?: number) {
    return this.create({
      frequency: Reactory.Models.ReactoryCalendarRecurrenceFrequency.YEARLY,
      interval,
      byMonth,
      byMonthDay,
      endDate,
      count
    });
  }

  // Calculate next occurrence from a given date
  calculateNextOccurrence(fromDate: Date): Date | null {
    const nextDate = new Date(fromDate);

    switch (this.frequency) {
      case Reactory.Models.ReactoryCalendarRecurrenceFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + this.interval);
        break;

      case Reactory.Models.ReactoryCalendarRecurrenceFrequency.WEEKLY:
        if (this.byDay && this.byDay.length > 0) {
          // Find next day of week in the pattern
          const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          const targetDays = this.byDay.map(day => dayNames.indexOf(day)).filter(day => day >= 0);

          if (targetDays.length > 0) {
            const currentDay = nextDate.getDay();
            const nextTargetDay = targetDays.find(day => day > currentDay) ?? targetDays[0];
            const daysToAdd = nextTargetDay > currentDay ? nextTargetDay - currentDay : 7 - currentDay + nextTargetDay;
            nextDate.setDate(nextDate.getDate() + daysToAdd);
          } else {
            nextDate.setDate(nextDate.getDate() + (7 * this.interval));
          }
        } else {
          nextDate.setDate(nextDate.getDate() + (7 * this.interval));
        }
        break;

      case Reactory.Models.ReactoryCalendarRecurrenceFrequency.MONTHLY:
        if (this.byMonthDay && this.byMonthDay.length > 0) {
          // Handle specific days of month
          const targetDay = this.byMonthDay[0]; // Simplified - take first
          if (targetDay > 0) {
            nextDate.setMonth(nextDate.getMonth() + this.interval, targetDay);
          } else {
            // Negative day (from end of month)
            nextDate.setMonth(nextDate.getMonth() + this.interval + 1, targetDay);
          }
        } else {
          nextDate.setMonth(nextDate.getMonth() + this.interval);
        }
        break;

      case Reactory.Models.ReactoryCalendarRecurrenceFrequency.YEARLY:
        if (this.byMonth && this.byMonth.length > 0 && this.byMonthDay && this.byMonthDay.length > 0) {
          const targetMonth = this.byMonth[0] - 1; // 0-based
          const targetDay = this.byMonthDay[0];
          nextDate.setFullYear(nextDate.getFullYear() + this.interval, targetMonth, targetDay);
        } else {
          nextDate.setFullYear(nextDate.getFullYear() + this.interval);
        }
        break;
    }

    // Check end conditions
    if (this.endDate && nextDate > this.endDate) {
      return null;
    }

    // Check if we've exceeded count (would need to be tracked externally)
    // For now, just return the next date

    return nextDate;
  }

  // Generate all occurrences between start and end dates
  generateOccurrences(startDate: Date, endDate: Date, baseDate: Date): Date[] {
    const occurrences: Date[] = [];
    let currentDate = new Date(baseDate);

    // Skip exceptions
    const exceptions = this.exceptions || [];

    while (currentDate <= endDate) {
      if (currentDate >= startDate) {
        // Check if this date is an exception
        const isException = exceptions.some(exception =>
          exception.toDateString() === currentDate.toDateString()
        );

        if (!isException) {
          occurrences.push(new Date(currentDate));
        }
      }

      const nextDate = this.calculateNextOccurrence(currentDate);
      if (!nextDate || nextDate > endDate) break;

      currentDate = nextDate;
    }

    return occurrences;
  }

  // Validate recurrence pattern
  isValid(): boolean {
    // Check interval
    if (this.interval < 1) return false;

    // Check end conditions (can't have both endDate and count)
    if (this.endDate && this.count) return false;

    // Validate frequency-specific constraints
    switch (this.frequency) {
      case Reactory.Models.ReactoryCalendarRecurrenceFrequency.WEEKLY:
        if (this.byDay) {
          const validDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          return this.byDay.every(day => validDays.includes(day));
        }
        break;

      case Reactory.Models.ReactoryCalendarRecurrenceFrequency.MONTHLY:
        if (this.byMonthDay) {
          return this.byMonthDay.every(day => day >= -31 && day <= 31 && day !== 0);
        }
        break;

      case Reactory.Models.ReactoryCalendarRecurrenceFrequency.YEARLY:
        if (this.byMonth) {
          return this.byMonth.every(month => month >= 1 && month <= 12);
        }
        if (this.byMonthDay) {
          return this.byMonthDay.every(day => day >= -31 && day <= 31 && day !== 0);
        }
        break;
    }

    return true;
  }
}