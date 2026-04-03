import { z } from 'zod';

export const waitlistBasicInfoSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
});

export const waitlistSocialProofSchema = z.object({
  socialLink: z
    .string()
    .url('Invalid URL format')
    .max(500, 'URL must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  followerRange: z.string().min(1, 'Please select your follower range').max(50, 'Invalid follower range'),
});

export const waitlistInterviewSchema = z.object({
  responses: z.record(
    z.string(),
    z.string().min(1, 'Response cannot be empty').max(1000, 'Response must be less than 1000 characters').trim()
  ),
});

export type WaitlistBasicInfo = z.infer<typeof waitlistBasicInfoSchema>;
export type WaitlistSocialProof = z.infer<typeof waitlistSocialProofSchema>;
export type WaitlistInterview = z.infer<typeof waitlistInterviewSchema>;
