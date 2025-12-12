import { getPool } from '@/lib/db/connection';
import { Pool } from 'pg';

jest.mock('pg');

describe('Database Connection', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool);
  });

  describe('getPool', () => {
    it('creates and returns a pool instance', () => {
      const pool = getPool();
      
      expect(pool).toBeDefined();
      expect(Pool).toHaveBeenCalled();
    });

    it('returns the same pool instance on multiple calls', () => {
      const pool1 = getPool();
      const pool2 = getPool();
      
      expect(pool1).toBe(pool2);
    });
  });
});
