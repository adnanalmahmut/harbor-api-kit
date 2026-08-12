import {
  hideInternalUserName,
  normalizeBetterAuthOpenApiDocument,
  normalizeBetterAuthUserRequest,
} from './better-auth-user-fields.js';

describe('Better Auth public user fields', () => {
  it('derives the internal name during email sign-up', () => {
    expect(
      normalizeBetterAuthUserRequest('/sign-up/email', {
        email: 'user@example.com',
        password: 'Password123!',
        firstName: '  First  ',
        lastName: ' Last ',
        name: 'Client controlled',
      }),
    ).toEqual({
      body: {
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'First',
        lastName: 'Last',
        name: 'First Last',
      },
    });
  });

  it('rejects missing public name fields', () => {
    expect(
      normalizeBetterAuthUserRequest('/sign-up/email', {
        email: 'user@example.com',
      }),
    ).toEqual({
      error: 'firstName and lastName are required and must not be empty.',
    });
  });

  it('removes the internal name only from user-shaped responses', () => {
    expect(
      hideInternalUserName({
        user: {
          id: 'u1',
          email: 'user@example.com',
          name: 'Internal Name',
          firstName: 'First',
          lastName: 'Last',
        },
        organization: { id: 'o1', name: 'Visible Organization' },
      }),
    ).toEqual({
      user: {
        id: 'u1',
        email: 'user@example.com',
        firstName: 'First',
        lastName: 'Last',
      },
      organization: { id: 'o1', name: 'Visible Organization' },
    });
  });

  it('documents a default client IP for sign-up and sign-in only', () => {
    const document = {
      paths: {
        '/sign-up/email': { post: {} },
        '/sign-in/email': { post: {} },
        '/get-session': { get: {} },
      },
    };

    normalizeBetterAuthOpenApiDocument(document);

    for (const path of ['/sign-up/email', '/sign-in/email'] as const) {
      expect(document.paths[path].post).toMatchObject({
        parameters: [
          {
            name: 'X-Forwarded-For',
            in: 'header',
            required: true,
            example: '192.29.224.220',
            schema: {
              type: 'string',
              format: 'ipv4',
              default: '192.29.224.220',
              example: '192.29.224.220',
            },
          },
        ],
      });
    }
    expect(document.paths['/get-session'].get).not.toHaveProperty('parameters');
  });
});
