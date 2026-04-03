import { z } from 'zod';

export const basicInfoSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  artistName: z.string().optional(),
});

export const socialProofSchema = z.object({
  instagramUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  tiktokUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  followerRange: z.enum([
    '1k-5k',
    '5k-10k',
    '10k-50k',
    '50k-100k',
    '100k+',
  ]).optional(),
});

export type BasicInfoData = z.infer<typeof basicInfoSchema>;
export type SocialProofData = z.infer<typeof socialProofSchema>;
