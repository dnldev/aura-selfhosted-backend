

import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z.string().min(1).max(50).trim(),
  password: z.string().min(8).max(128),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).trim().optional(),
});

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RecoverSchema = z.object({
  recoveryCode: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const ChangeEmailSchema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email(),
});

export const ForgotPasswordSchema = z.object({
  identifier: z.string().min(1).max(200).trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const BookStatusValues = ['want-to-read', 'reading', 'finished', 'did-not-finish'] as const;

export const NewBookSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().max(500).optional(),
  coverUrl: z.string().url().nullable().optional(),
  status: z.enum(BookStatusValues).optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  review: z.string().max(10_000).nullable().optional(),
  series: z.string().max(500).nullable().optional(),
  pageCount: z.number().int().min(0).nullable().optional(),
  currentPage: z.number().int().min(0).nullable().optional(),
  totalHours: z.number().min(0).nullable().optional(),
  currentHours: z.number().min(0).nullable().optional(),
  playbackSpeed: z.number().min(0.1).max(10).nullable().optional(),
  dateStarted: z.string().nullable().optional(),
  dateFinished: z.string().nullable().optional(),
  worldbuilding: z.number().min(0).max(5).nullable().optional(),
  characters: z.number().min(0).max(5).nullable().optional(),
  plot: z.number().min(0).max(5).nullable().optional(),
  writing: z.number().min(0).max(5).nullable().optional(),
});

export const UpdateBookSchema = NewBookSchema.partial();

export const NewSessionSchema = z.object({
  bookId: z.string().uuid(),
  date: z.string().min(1),
  pagesRead: z.number().int().min(0).optional(),
  minutesListened: z.number().min(0).nullable().optional(),
  minutesRead: z.number().min(0).nullable().optional(),
});

export const NewTicketSchema = z.object({
  subject: z.string().min(1).max(500),
  initialMessage: z.string().min(1).max(5000),
});

export const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  newMessage: z.object({
    sender: z.enum(['user', 'support']),
    text: z.string().min(1).max(5000),
  }).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type NewBookInput = z.infer<typeof NewBookSchema>;
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>;
export type NewSessionInput = z.infer<typeof NewSessionSchema>;
