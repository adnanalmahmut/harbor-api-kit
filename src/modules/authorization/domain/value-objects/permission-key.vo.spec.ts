import { AuthorizationDomainException } from '../exceptions/authorization-domain.exception.js';
import {
  PERMISSION_KEY_PATTERN,
  PermissionKeyVO,
} from './permission-key.vo.js';

describe('PermissionKeyVO', () => {
  describe('isValid', () => {
    it('should return true for valid permission keys', () => {
      expect(PermissionKeyVO.isValid('user:read')).toBe(true);
      expect(PermissionKeyVO.isValid('role:manage')).toBe(true);
      expect(PermissionKeyVO.isValid('permission:create')).toBe(true);
      expect(PermissionKeyVO.isValid('user_profile:update')).toBe(true);
    });

    it('should return false for invalid permission keys', () => {
      expect(PermissionKeyVO.isValid('invalid')).toBe(false);
      expect(PermissionKeyVO.isValid('')).toBe(false);
      expect(PermissionKeyVO.isValid('user:')).toBe(false);
      expect(PermissionKeyVO.isValid(':read')).toBe(false);
      expect(PermissionKeyVO.isValid('User:Read')).toBe(false); // uppercase
      expect(PermissionKeyVO.isValid('user:read:extra')).toBe(false); // too many parts
      expect(PermissionKeyVO.isValid('user-profile:read')).toBe(true);
      expect(PermissionKeyVO.isValid('user 123:read')).toBe(false); // spaces/numbers
    });
  });

  describe('parse', () => {
    it('should parse valid permission key', () => {
      const vo = PermissionKeyVO.parse('user:read');
      expect(vo.subject).toBe('user');
      expect(vo.action).toBe('read');
      expect(vo.toString()).toBe('user:read');
    });

    it('should throw AuthorizationDomainException for invalid key', () => {
      expect(() => PermissionKeyVO.parse('invalid')).toThrow(
        AuthorizationDomainException,
      );
      expect(() => PermissionKeyVO.parse('')).toThrow(
        AuthorizationDomainException,
      );
      expect(() => PermissionKeyVO.parse('User:Read')).toThrow(
        AuthorizationDomainException,
      );
    });
  });

  describe('fromParts', () => {
    it('should create VO from valid parts', () => {
      const vo = PermissionKeyVO.fromParts('role', 'create');
      expect(vo.subject).toBe('role');
      expect(vo.action).toBe('create');
      expect(vo.toString()).toBe('role:create');
    });

    it('should normalize to lowercase', () => {
      const vo = PermissionKeyVO.fromParts('USER', 'READ');
      expect(vo.subject).toBe('user');
      expect(vo.action).toBe('read');
    });

    it('should throw for invalid parts', () => {
      expect(() => PermissionKeyVO.fromParts('', 'read')).toThrow(
        AuthorizationDomainException,
      );
      expect(() => PermissionKeyVO.fromParts('user', '')).toThrow(
        AuthorizationDomainException,
      );
      expect(() => PermissionKeyVO.fromParts('user name', 'read')).toThrow(
        AuthorizationDomainException,
      );
    });
  });

  describe('PERMISSION_KEY_PATTERN', () => {
    it('should match valid patterns', () => {
      expect(PERMISSION_KEY_PATTERN.test('user:read')).toBe(true);
      expect(PERMISSION_KEY_PATTERN.test('role_permission:manage')).toBe(true);
      expect(PERMISSION_KEY_PATTERN.test('user:set-role')).toBe(true);
    });

    it('should not match invalid patterns', () => {
      expect(PERMISSION_KEY_PATTERN.test('User:read')).toBe(false);
      expect(PERMISSION_KEY_PATTERN.test('user:Read')).toBe(false);
      expect(PERMISSION_KEY_PATTERN.test('user:read:extra')).toBe(false);
    });
  });
});
