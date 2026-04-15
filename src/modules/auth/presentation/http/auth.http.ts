import {
  AppErrorCode,
  createApiError,
  createApiResponseConfig,
  createApiSuccess,
  type ApiResponseConfig,
} from '#src/core/index.js';
import type { CookieDirective } from '#src/modules/auth/domain/index.js';
import { HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  GetSessionResponseDto,
  SessionResponseDto,
  SignInResponseDto,
  SignUpResponseDto,
  SocialSignInResponseDto,
  StatusResponseDto,
} from './auth.http.dtos.js';

export function serializeCookie(c: CookieDirective): string {
  let str = `${c.name}=${c.value}`;

  if (c.options) {
    if (c.options.maxAge !== undefined)
      str += `; Max-Age=${Math.floor(c.options.maxAge)}`;
    if (c.options.domain) str += `; Domain=${c.options.domain}`;
    if (c.options.path) str += `; Path=${c.options.path}`;
    if (c.options.expires)
      str += `; Expires=${c.options.expires.toUTCString()}`;
    if (c.options.httpOnly) str += '; HttpOnly';
    if (c.options.secure) str += '; Secure';
    if (c.options.sameSite) {
      const ss = c.options.sameSite.toLowerCase();
      str += `; SameSite=${ss.charAt(0).toUpperCase() + ss.slice(1)}`;
    }
  }

  return str;
}

export function applyCookies(reply: FastifyReply, cookies?: CookieDirective[]) {
  if (!cookies || cookies.length === 0) return;

  const serialized = cookies.map(serializeCookie);
  const existing = reply.getHeader('set-cookie');
  const current = Array.isArray(existing)
    ? existing.map(String)
    : existing
      ? [String(existing)]
      : [];

  reply.header('set-cookie', [...current, ...serialized]);
}

/**
 * Auth module API response examples for Swagger documentation
 * Each endpoint has both success response and possible error responses
 */
export const AUTH_RESPONSES = {
  signOut: createApiResponseConfig(
    createApiSuccess('Sign out successful', HttpStatus.OK, undefined),
    [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid')],
  ),

  register: createApiResponseConfig(
    createApiSuccess(
      'Registration successful',
      HttpStatus.CREATED,
      undefined,
      SignUpResponseDto,
    ),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required'),
      createApiError(AppErrorCode.CONFLICT, 'This Email already exists'),
      createApiError(AppErrorCode.FORBIDDEN, 'Registration is disabled'),
      createApiError(
        AppErrorCode.UNPROCESSABLE_ENTITY,
        'Password does not meet requirements',
      ),
    ],
  ),

  login: createApiResponseConfig(
    createApiSuccess(
      'Login successful',
      HttpStatus.OK,
      undefined,
      SignInResponseDto,
    ),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required'),
      createApiError(AppErrorCode.UNAUTHORIZED, 'Invalid credentials'),
    ],
  ),

  verifyEmail: createApiResponseConfig(
    createApiSuccess('', HttpStatus.FOUND),
    [],
  ),

  sendVerificationEmail: createApiResponseConfig(
    createApiSuccess('Verification email sent', HttpStatus.OK),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required'),
      createApiError(AppErrorCode.BAD_REQUEST, 'Email already verified'),
    ],
  ),

  forgotPassword: createApiResponseConfig(
    createApiSuccess('Password reset email sent', HttpStatus.OK),
    [createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required')],
  ),

  resetPassword: createApiResponseConfig(
    createApiSuccess('Password reset successful', HttpStatus.OK),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Token is required'),
      createApiError(AppErrorCode.UNAUTHORIZED, 'Invalid or expired token'),
    ],
  ),

  checkResetToken: createApiResponseConfig(
    createApiSuccess('', HttpStatus.FOUND, undefined),
    [],
  ),

  verifyPassword: createApiResponseConfig(
    createApiSuccess('Password verified', HttpStatus.OK, { valid: true }),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Password is required'),
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
    ],
  ),

  changePassword: createApiResponseConfig(
    createApiSuccess('Password changed successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Password is required'),
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.BAD_REQUEST, 'Current password is incorrect'),
    ],
  ),

  changeEmail: createApiResponseConfig(
    createApiSuccess('Email change verification sent', HttpStatus.OK),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required'),
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.CONFLICT, 'This Email already exists'),
    ],
  ),

  listSessions: createApiResponseConfig(
    createApiSuccess('Sessions retrieved', HttpStatus.OK, undefined, [
      SessionResponseDto,
    ]),
    [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid')],
  ),

  revokeSession: createApiResponseConfig(
    createApiSuccess('Session revoked', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid'),
      createApiError(AppErrorCode.NOT_FOUND, 'Session not found'),
    ],
  ),

  revokeSessions: createApiResponseConfig(
    createApiSuccess('Sessions revoked', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid'),
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Tokens array is required'),
      createApiError(AppErrorCode.NOT_FOUND, 'Session not found'),
    ],
  ),

  revokeOtherSessions: createApiResponseConfig(
    createApiSuccess('Other sessions revoked', HttpStatus.OK),
    [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid')],
  ),

  updateUser: createApiResponseConfig(
    createApiSuccess(
      'User updated successfully',
      HttpStatus.OK,
      undefined,
      StatusResponseDto,
    ),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Invalid input'),
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid'),
      createApiError(AppErrorCode.BAD_REQUEST, 'Update failed'),
    ],
  ),

  deleteUser: createApiResponseConfig(
    createApiSuccess('User deleted successfully', HttpStatus.OK),
    [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid')],
  ),

  reactivateUser: createApiResponseConfig(
    createApiSuccess('User reactivated successfully', HttpStatus.OK),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Email is required'),
      createApiError(AppErrorCode.FORBIDDEN, 'Forbidden'),
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired or invalid'),
      createApiError(AppErrorCode.BAD_REQUEST, 'User is not deleted'),
      createApiError(AppErrorCode.NOT_FOUND, 'User not found'),
    ],
  ),

  socialSignIn: createApiResponseConfig(
    createApiSuccess(
      'Redirect URL generated',
      HttpStatus.OK,
      undefined,
      SocialSignInResponseDto,
    ),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Provider is required'),
      createApiError(AppErrorCode.BAD_REQUEST, 'Invalid provider'),
    ],
  ),

  linkSocial: createApiResponseConfig(
    createApiSuccess('Social account linking initiated', HttpStatus.OK, {
      url: 'https://provider.com/oauth/authorize?...',
    }),
    [
      createApiError(AppErrorCode.VALIDATION_ERROR, 'Provider is required'),
      createApiError(AppErrorCode.BAD_REQUEST, 'Invalid provider'),
    ],
  ),

  listLinkedAccounts: createApiResponseConfig(
    createApiSuccess('Linked accounts retrieved', HttpStatus.OK, {
      accounts: [{ providerId: 'google', email: 'user@gmail.com' }],
    }),
    [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired')],
  ),

  unlinkAccount: createApiResponseConfig(
    createApiSuccess('Account unlinked', HttpStatus.OK),
    [
      createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired'),
      createApiError(AppErrorCode.NOT_FOUND, 'Account not found'),
    ],
  ),

  me: createApiResponseConfig(
    createApiSuccess(
      'Session retrieved',
      HttpStatus.OK,
      undefined,
      GetSessionResponseDto,
    ),
    [createApiError(AppErrorCode.UNAUTHORIZED, 'Session expired')],
  ),
} as const satisfies Record<string, ApiResponseConfig>;

export const AUTH_ERRORS = {
  signOut: AUTH_RESPONSES.signOut.errors,
  register: AUTH_RESPONSES.register.errors,
  login: AUTH_RESPONSES.login.errors,
  verifyEmail: AUTH_RESPONSES.verifyEmail.errors,
  sendVerificationEmail: AUTH_RESPONSES.sendVerificationEmail.errors,
  forgotPassword: AUTH_RESPONSES.forgotPassword.errors,
  resetPassword: AUTH_RESPONSES.resetPassword.errors,
  checkResetToken: AUTH_RESPONSES.checkResetToken.errors,
  verifyPassword: AUTH_RESPONSES.verifyPassword.errors,
  changePassword: AUTH_RESPONSES.changePassword.errors,
  changeEmail: AUTH_RESPONSES.changeEmail.errors,
  listSessions: AUTH_RESPONSES.listSessions.errors,
  revokeSession: AUTH_RESPONSES.revokeSession.errors,
  revokeSessions: AUTH_RESPONSES.revokeSessions.errors,
  revokeOtherSessions: AUTH_RESPONSES.revokeOtherSessions.errors,
  updateUser: AUTH_RESPONSES.updateUser.errors,
  deleteUser: AUTH_RESPONSES.deleteUser.errors,
  reactivateUser: AUTH_RESPONSES.reactivateUser.errors,
  socialSignIn: AUTH_RESPONSES.socialSignIn.errors,
  linkSocial: AUTH_RESPONSES.linkSocial.errors,
  listLinkedAccounts: AUTH_RESPONSES.listLinkedAccounts.errors,
  unlinkAccount: AUTH_RESPONSES.unlinkAccount.errors,
  me: AUTH_RESPONSES.me.errors,
};
