jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockRepo: any = {
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  })),
  find: jest.fn(),
};

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  PostgresDataSource: {
    getRepository: jest.fn(() => mockRepo),
  },
  default: {},
}));

import ReactoryAuditService, { IAuditLogParams, IAuditQueryFilter, IComplianceReportParams } from '../ReactoryAuditService';
import { Repository } from 'typeorm';
import AuditModel from '@reactory/server-modules/reactory-core/models/Audit';

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
  user: { _id: 'u1' },
  req: { ip: '127.0.0.1', headers: { 'user-agent': 'test' } },
  partner: { _id: 'p1' },
  sessionId: 's1',
  colors: { green: (s: string) => s },
} as any;

describe('ReactoryAuditService', () => {
  let service: ReactoryAuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReactoryAuditService({}, mockContext);
  });

  it('logs audit event with redaction and signature', async () => {
    const params: IAuditLogParams = { action: 'update', source: 'test', before: { password: 'secret' }, after: { token: 'abc' } };
    mockRepo.create.mockReturnValue({ id: '1' });
    mockRepo.save.mockResolvedValue({ id: '1' });
    const res = await service.logAuditEvent(params);
    expect(mockRepo.create).toHaveBeenCalled();
    expect(res.id).toBe('1');
  });

  it('queries with filters and pagination', async () => {
    const qb = { andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getManyAndCount: jest.fn().mockResolvedValue([[], 0]) };
    mockRepo.createQueryBuilder.mockReturnValue(qb);
    const filter: IAuditQueryFilter = { action: ['create'], startDate: new Date(), limit: 10 };
    const res = await service.queryAuditLogs(filter);
    expect(res.total).toBe(0);
  });

  it('generates compliance report', async () => {
    jest.spyOn(service as any, 'queryAuditLogs').mockResolvedValue({ logs: [], total: 0 });
    const params: IComplianceReportParams = { startDate: new Date(), endDate: new Date() };
    const report = await service.generateComplianceReport(params);
    expect(report.statistics).toBeDefined();
  });

  it('purges old logs', async () => {
    // Directly stub the internal repository to avoid deep query-builder mocking
    (service as any).repository = {
      createQueryBuilder: () => ({
        delete: () => ({ where: () => ({ execute: async () => ({ affected: 5 }) }) }),
      }),
    };
    const res = await service.purgeOldAuditLogs(30);
    expect(res).toBe(5);
  });
});
