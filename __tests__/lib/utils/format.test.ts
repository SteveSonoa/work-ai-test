import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  truncate,
  getStatusColor,
  isValidEmail,
  buildQueryString,
  parseQueryString,
  formatStatus,
} from '@/lib/utils/format';

describe('Format Utilities', () => {
  describe('formatCurrency', () => {
    it('formats positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('formats negative numbers correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
    });

    it('handles decimal precision', () => {
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(10.123)).toBe('$10.12');
    });

    it('handles string numbers', () => {
      expect(formatCurrency('1234.56')).toBe('$1,234.56');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date string', () => {
      const result = formatDate('2024-12-11T10:30:00Z');
      expect(result).toMatch(/Dec \d+, 2024/);
    });

    it('formats Date object', () => {
      const date = new Date('2024-12-11T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/Dec \d+, 2024/);
    });

    it('handles invalid dates', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
    });
  });

  describe('formatStatus', () => {
    it('formats transfer statuses correctly', () => {
      expect(formatStatus('PENDING')).toBe('Pending');
      expect(formatStatus('PENDING_APPROVAL')).toBe('Pending Approval');
      expect(formatStatus('COMPLETED')).toBe('Completed');
      expect(formatStatus('REJECTED')).toBe('Rejected');
    });

    it('handles lowercase input', () => {
      expect(formatStatus('pending')).toBe('Pending');
    });

    it('replaces underscores with spaces', () => {
      expect(formatStatus('PENDING_APPROVAL')).toBe('Pending Approval');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time correctly', () => {
      const date = new Date('2025-12-11T10:30:00Z');
      const result = formatDateTime(date);
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
    });

    it('handles string input', () => {
      const result = formatDateTime('2025-12-11T10:30:00Z');
      expect(result).toBeTruthy();
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('formats minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('formats hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('formats days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('falls back to formatDate for old dates', () => {
      const longAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(longAgo);
      expect(result).toMatch(/\d+, 20\d\d/);
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncate(longText, 10)).toBe('This is...');
    });

    it('does not truncate short strings', () => {
      const shortText = 'Short';
      expect(truncate(shortText, 10)).toBe('Short');
    });

    it('handles exact length', () => {
      const text = '1234567890';
      expect(truncate(text, 10)).toBe('1234567890');
    });

    it('handles empty strings', () => {
      expect(truncate('', 10)).toBe('');
    });
  });

  describe('getStatusColor', () => {
    it('returns correct color for COMPLETED', () => {
      expect(getStatusColor('COMPLETED')).toContain('green');
    });

    it('returns correct color for PENDING', () => {
      expect(getStatusColor('PENDING')).toContain('gray');
    });

    it('returns correct color for FAILED', () => {
      expect(getStatusColor('FAILED')).toContain('red');
    });

    it('returns correct color for REJECTED', () => {
      expect(getStatusColor('REJECTED')).toContain('red');
    });

    it('returns correct color for AWAITING_APPROVAL', () => {
      expect(getStatusColor('AWAITING_APPROVAL')).toContain('yellow');
    });

    it('returns correct color for APPROVED', () => {
      expect(getStatusColor('APPROVED')).toContain('blue');
    });

    it('returns default color for unknown status', () => {
      expect(getStatusColor('UNKNOWN')).toContain('gray');
    });
  });

  describe('isValidEmail', () => {
    it('validates correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('user_name@domain.com')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('buildQueryString', () => {
    it('builds query string from object', () => {
      const params = { name: 'John', age: '30', active: 'true' };
      const result = buildQueryString(params);
      expect(result).toContain('?');
      expect(result).toContain('name=John');
      expect(result).toContain('age=30');
      expect(result).toContain('active=true');
    });

    it('skips undefined and null values', () => {
      const params = { name: 'John', age: undefined, city: null, active: '' };
      const result = buildQueryString(params);
      expect(result).toContain('name=John');
      expect(result).not.toContain('age');
      expect(result).not.toContain('city');
      expect(result).not.toContain('active');
    });

    it('returns empty string for empty object', () => {
      expect(buildQueryString({})).toBe('');
    });

    it('handles special characters', () => {
      const params = { name: 'John Doe', search: 'test & value' };
      const result = buildQueryString(params);
      expect(result).toBeTruthy();
    });
  });

  describe('parseQueryString', () => {
    it('parses query string to object', () => {
      const queryString = 'name=John&age=30&active=true';
      const result = parseQueryString(queryString);
      expect(result.name).toBe('John');
      expect(result.age).toBe('30');
      expect(result.active).toBe('true');
    });

    it('handles empty query string', () => {
      expect(parseQueryString('')).toEqual({});
    });

    it('handles question mark prefix', () => {
      const result = parseQueryString('?name=John&age=30');
      expect(result.name).toBe('John');
      expect(result.age).toBe('30');
    });

    it('handles encoded values', () => {
      const result = parseQueryString('name=John%20Doe');
      expect(result.name).toBe('John Doe');
    });
  });
});
