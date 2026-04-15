import { UpdateUserDto } from './auth.http.dtos.js';

describe('UpdateUserDto', () => {
  it('accepts an empty string image value', () => {
    const result = (UpdateUserDto as any).schema.safeParse({
      image: '',
    });

    expect(result.success).toBe(true);
  });

  it('continues to accept valid image URLs', () => {
    const result = (UpdateUserDto as any).schema.safeParse({
      image: 'https://example.com/avatar.png',
    });

    expect(result.success).toBe(true);
  });
});
