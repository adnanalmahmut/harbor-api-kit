import { User } from './auth.entities.js';

describe('Auth User entity', () => {
  it('defaults image to an empty string', () => {
    const user = new User('user-1', 'user@example.com', false, 'Test User');

    expect(user.image).toBe('');
  });
});
