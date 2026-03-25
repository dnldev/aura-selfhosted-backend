

import { describe, it, expect } from 'vitest';

import {
  RegisterSchema, LoginSchema, RecoverSchema, ChangeEmailSchema,
  ForgotPasswordSchema, ResetPasswordSchema,
  NewBookSchema, UpdateBookSchema, NewSessionSchema, NewTicketSchema, UpdateTicketSchema,
} from '../src/schemas.js';

describe('RegisterSchema', () => {
  it('accepts valid registration data', () => {
    const result = RegisterSchema.safeParse({
      username: 'testuser',
      password: 'securepassword123',
      email: 'test@example.com',
      displayName: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing username', () => {
    const result = RegisterSchema.safeParse({ password: 'password123' });
    expect(result.success).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = RegisterSchema.safeParse({ username: 'user', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = RegisterSchema.safeParse({ username: 'user', password: 'password123', email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts registration without optional fields', () => {
    const result = RegisterSchema.safeParse({ username: 'user', password: 'password123' });
    expect(result.success).toBe(true);
  });
});

describe('LoginSchema', () => {
  it('accepts valid login data', () => {
    const result = LoginSchema.safeParse({ username: 'user', password: 'pass' });
    expect(result.success).toBe(true);
  });

  it('rejects empty username', () => {
    const result = LoginSchema.safeParse({ username: '', password: 'pass' });
    expect(result.success).toBe(false);
  });
});

describe('NewBookSchema', () => {
  it('accepts a valid book with required fields only', () => {
    const result = NewBookSchema.safeParse({ title: 'The Way of Kings' });
    expect(result.success).toBe(true);
  });

  it('rejects a rating above 5', () => {
    const result = NewBookSchema.safeParse({ title: 'Book', rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status value', () => {
    const result = NewBookSchema.safeParse({ title: 'Book', status: 'unknown-status' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid status values', () => {
    for (const status of ['want-to-read', 'reading', 'finished', 'did-not-finish']) {
      const result = NewBookSchema.safeParse({ title: 'Book', status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });

  it('rejects negative page count', () => {
    const result = NewBookSchema.safeParse({ title: 'Book', pageCount: -1 });
    expect(result.success).toBe(false);
  });
});

describe('UpdateBookSchema', () => {
  it('accepts partial updates', () => {
    const result = UpdateBookSchema.safeParse({ rating: 4.5 });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no-op update)', () => {
    const result = UpdateBookSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('NewSessionSchema', () => {
  it('accepts a valid session', () => {
    const result = NewSessionSchema.safeParse({
      bookId: '550e8400-e29b-41d4-a716-446655440000',
      date: '2025-01-15',
      pagesRead: 30,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID bookId', () => {
    const result = NewSessionSchema.safeParse({ bookId: 'not-a-uuid', date: '2025-01-15' });
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const result = NewSessionSchema.safeParse({ bookId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(false);
  });
});

describe('NewTicketSchema', () => {
  it('accepts valid ticket', () => {
    const result = NewTicketSchema.safeParse({ subject: 'Help', initialMessage: 'I need assistance' });
    expect(result.success).toBe(true);
  });

  it('rejects empty subject', () => {
    const result = NewTicketSchema.safeParse({ subject: '', initialMessage: 'Message' });
    expect(result.success).toBe(false);
  });
});

describe('UpdateTicketSchema', () => {
  it('accepts status update', () => {
    const result = UpdateTicketSchema.safeParse({ status: 'closed' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = UpdateTicketSchema.safeParse({ status: 'in-progress' });
    expect(result.success).toBe(false);
  });

  it('accepts a new message with valid sender', () => {
    const result = UpdateTicketSchema.safeParse({
      newMessage: { sender: 'user', text: 'Thanks!' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects new message with invalid sender', () => {
    const result = UpdateTicketSchema.safeParse({
      newMessage: { sender: 'bot', text: 'Hello' },
    });
    expect(result.success).toBe(false);
  });
});

describe('RecoverSchema', () => {
  it('accepts valid recovery data', () => {
    const result = RecoverSchema.safeParse({ recoveryCode: 'AURA-1234-ABCD-EF12', newPassword: 'newpassword123' });
    expect(result.success).toBe(true);
  });

  it('rejects short new password', () => {
    const result = RecoverSchema.safeParse({ recoveryCode: 'AURA-1234-ABCD-EF12', newPassword: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('ChangeEmailSchema', () => {
  it('accepts valid email change', () => {
    const result = ChangeEmailSchema.safeParse({ currentPassword: 'password123', newEmail: 'new@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = ChangeEmailSchema.safeParse({ currentPassword: 'password123', newEmail: 'not-valid' });
    expect(result.success).toBe(false);
  });
});

describe('ForgotPasswordSchema', () => {
  it('accepts a username identifier', () => {
    const result = ForgotPasswordSchema.safeParse({ identifier: 'daniel' });
    expect(result.success).toBe(true);
  });

  it('accepts an email identifier', () => {
    const result = ForgotPasswordSchema.safeParse({ identifier: 'daniel@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects empty identifier', () => {
    const result = ForgotPasswordSchema.safeParse({ identifier: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing identifier', () => {
    const result = ForgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('trims whitespace from identifier', () => {
    const result = ForgotPasswordSchema.safeParse({ identifier: '  daniel  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.identifier).toBe('daniel');
    }
  });
});

describe('ResetPasswordSchema', () => {
  it('accepts valid reset request', () => {
    const result = ResetPasswordSchema.safeParse({ token: 'jwt-token-here', newPassword: 'newpassword123' });
    expect(result.success).toBe(true);
  });

  it('rejects missing token', () => {
    const result = ResetPasswordSchema.safeParse({ newPassword: 'newpassword123' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = ResetPasswordSchema.safeParse({ token: 'jwt-token-here', newPassword: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects password exceeding max length', () => {
    const result = ResetPasswordSchema.safeParse({ token: 'jwt-token-here', newPassword: 'a'.repeat(129) });
    expect(result.success).toBe(false);
  });

  it('rejects empty body', () => {
    const result = ResetPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
