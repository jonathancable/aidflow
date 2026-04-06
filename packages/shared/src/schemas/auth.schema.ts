import { z } from 'zod';
import { UserRole } from '../enums';

export const RegisterSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8).max(100)
              .regex(/[A-Z]/, 'Must contain uppercase')
              .regex(/[0-9]/, 'Must contain a number'),
  fullName: z.string().min(2).max(100),
  role:     UserRole.exclude(['system_admin', 'system_controller']),
  orgId:    z.string().uuid().optional(),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const PasswordResetSchema = z.object({
  token:       z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export type RegisterInput       = z.infer<typeof RegisterSchema>;
export type LoginInput          = z.infer<typeof LoginSchema>;
export type PasswordResetInput  = z.infer<typeof PasswordResetSchema>;