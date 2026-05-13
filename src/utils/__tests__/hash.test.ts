import Hash from '../hash';

describe('Hash Function', () => {
  describe('string hashing', () => {
    it('should return consistent hash for same string', () => {
      const hash1 = Hash('test');
      const hash2 = Hash('test');
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different strings', () => {
      const hash1 = Hash('test1');
      const hash2 = Hash('test2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return number', () => {
      const result = Hash('test');
      expect(typeof result).toBe('number');
    });
  });

  describe('number hashing', () => {
    it('should return the number itself for numbers', () => {
      expect(Hash(42)).toBe(42);
      expect(Hash(0)).toBe(0);
      expect(Hash(-1)).toBe(-1);
    });
  });

  describe('object hashing', () => {
    it('should return consistent hash for same object structure', () => {
      const obj1 = { a: 1, b: 'test' };
      const obj2 = { a: 1, b: 'test' };
      expect(Hash(obj1)).toBe(Hash(obj2));
    });

    it('should return different hash for different object structures', () => {
      const obj1 = { a: 1, b: 'test' };
      const obj2 = { a: 2, b: 'test' };
      expect(Hash(obj1)).not.toBe(Hash(obj2));
    });

    it('should handle nested objects', () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { b: 1 } };
      expect(Hash(obj1)).toBe(Hash(obj2));
    });

    it('should handle arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      expect(Hash(arr1)).toBe(Hash(arr2));
    });
  });

  describe('null and undefined', () => {
    it('should handle null', () => {
      const result = Hash(null);
      expect(typeof result).toBe('number');
    });

    it('should handle undefined', () => {
      const result = Hash(undefined);
      expect(typeof result).toBe('number');
    });
  });
});