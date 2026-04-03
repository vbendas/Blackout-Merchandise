# Wave 2 Task 1: Waitlist UI (Steps 1-3, 5)

## Objective
Create the complete waitlist UI flow for Steps 1-3 and Step 5, excluding the interview component (handled in Task 2).

## Context
This is the critical crowdfunding conversion flow. Must be pixel-perfect, mobile-responsive, and use the Merch From design system.

## Design System
- **Background**: zinc-950 (#09090b)
- **Primary Accent**: Recording Red (#E11D48)
- **CTA Buttons**: Gold sheen gradient
- **Typography**: Space Grotesk (headings), Inter (body)
- **Avatar**: Leopoldo (use Cloudinary)

## Files to Create

### 1. /mainpage/src/hooks/useWaitlistForm.ts
State management for the 5-step form flow.

```typescript
'use client';

import { useState, useCallback } from 'react';

export interface WaitlistFormData {
  fullName: string;
  email: string;
  artistName?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  followerRange?: string;
}

const initialFormData: WaitlistFormData = {
  fullName: '',
  email: '',
  artistName: '',
  instagramUrl: '',
  tiktokUrl: '',
  followerRange: '',
};

export function useWaitlistForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WaitlistFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = useCallback((updates: Partial<WaitlistFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const submitForm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Submission failed');
      
      nextStep(); // Go to success step
    } catch (error) {
      console.error('Submit error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, nextStep]);

  return {
    currentStep,
    formData,
    isSubmitting,
    updateFormData,
    goToStep,
    nextStep,
    prevStep,
    submitForm,
  };
}
```

### 2. /mainpage/src/lib/validation/waitlist.ts
Zod validation schemas.

```typescript
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
```

### 3. /mainpage/src/components/waitlist/WaitlistLayout.tsx
Layout wrapper with Leopoldo avatar.

```typescript
'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@heroui/react';

interface WaitlistLayoutProps {
  children: React.ReactNode;
}

export function WaitlistLayout({ children }: WaitlistLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 opacity-50" />
      
      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header with Logo */}
        <header className="flex justify-center mb-8">
          <img 
            src="/logo/full.png" 
            alt="Merch From" 
            className="h-8 w-auto"
          />
        </header>

        {/* Leopoldo Avatar - Always visible */}
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <Avatar
              src="https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/leopoldo/neutral_attr1_subject.png"
              className="w-24 h-24 border-2 border-rose-500/30"
              isBordered
              color="danger"
            />
            {/* Glow effect */}
            <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full -z-10" />
          </motion.div>
        </div>

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-zinc-500 text-sm">
          <p>© 2026 Merch From. Premium merch for artists who care.</p>
        </footer>
      </div>
    </div>
  );
}
```

### 4. /mainpage/src/components/waitlist/StepIndicator.tsx
Progress indicator for 5 steps.

```typescript
'use client';

import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepIndicator({ 
  currentStep, 
  totalSteps = 5 
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-600 to-rose-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      {/* Step circles */}
      <div className="flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isPending = step > currentStep;

          return (
            <div key={step} className="flex flex-col items-center">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-rose-500 text-white'
                    : isCurrent
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400 ring-offset-2 ring-offset-zinc-950'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
                animate={
                  isCurrent
                    ? { scale: [1, 1.1, 1] }
                    : {}
                }
                transition={
                  isCurrent
                    ? { duration: 2, repeat: Infinity }
                    : {}
                }
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 5. /mainpage/src/components/waitlist/Step1Welcome.tsx
Welcome screen with CTA.

```typescript
'use client';

import { motion } from 'framer-motion';

interface Step1WelcomeProps {
  onStart: () => void;
}

export function Step1Welcome({ onStart }: Step1WelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-6"
    >
      <motion.h1
        className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Ready to elevate your merch?
      </motion.h1>

      <motion.p
        className="text-zinc-400 text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Join artists who refuse to compromise on quality
      </motion.p>

      {/* Trust badges */}
      <motion.div
        className="flex flex-wrap justify-center gap-4 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {[
          'Zero upfront cost',
          'Premium quality',
          'AI-powered',
          'Ethical production',
        ].map((badge, i) => (
          <span
            key={badge}
            className="px-3 py-1 bg-zinc-800/50 rounded-full text-zinc-300 border border-zinc-700"
          >
            {badge}
          </span>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="pt-4"
      >
        <button
          onClick={onStart}
          className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black font-semibold rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
        >
          <span className="relative z-10 flex items-center gap-2">
            Start Application
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>
      </motion.div>

      {/* Social proof */}
      <motion.p
        className="text-zinc-500 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Join 2,000+ artists on the waitlist
      </motion.p>
    </motion.div>
  );
}
```

### 6. /mainpage/src/components/waitlist/Step2BasicInfo.tsx
Basic information form.

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { basicInfoSchema, BasicInfoData } from '@/lib/validation/waitlist';

interface Step2BasicInfoProps {
  data: { fullName: string; email: string; artistName?: string };
  onUpdate: (data: Partial<typeof data>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2BasicInfo({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}: Step2BasicInfoProps) {
  const [serverError, setServerError] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      fullName: data.fullName,
      email: data.email,
      artistName: data.artistName,
    },
    mode: 'onChange',
  });

  const onSubmit = (formData: BasicInfoData) => {
    onUpdate(formData);
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Let's get to know you</h2>
        <p className="text-zinc-400">This helps us personalize your experience</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Full Name *
          </label>
          <input
            {...register('fullName')}
            type="text"
            placeholder="Your full name"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-rose-400">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Email Address *
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-rose-400">{errors.email.message}</p>
          )}
        </div>

        {/* Artist Name (Optional) */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Artist/Band Name <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            {...register('artistName')}
            type="text"
            placeholder="Your artist or band name"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
          />
        </div>

        {serverError && (
          <p className="text-sm text-rose-400 text-center">{serverError}</p>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </form>
    </motion.div>
  );
}
```

### 7. /mainpage/src/components/waitlist/Step3SocialProof.tsx
Social media and follower count.

```typescript
'use client';

import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { socialProofSchema, SocialProofData } from '@/lib/validation/waitlist';

interface Step3SocialProofProps {
  data: {
    instagramUrl?: string;
    tiktokUrl?: string;
    followerRange?: string;
  };
  onUpdate: (data: Partial<typeof data>) => void;
  onNext: () => void;
  onBack: () => void;
}

const followerRanges = [
  { value: '1k-5k', label: '1,000 - 5,000' },
  { value: '5k-10k', label: '5,000 - 10,000' },
  { value: '10k-50k', label: '10,000 - 50,000' },
  { value: '50k-100k', label: '50,000 - 100,000' },
  { value: '100k+', label: '100,000+' },
];

export function Step3SocialProof({
  data,
  onUpdate,
  onNext,
  onBack,
}: Step3SocialProofProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SocialProofData>({
    resolver: zodResolver(socialProofSchema),
    defaultValues: {
      instagramUrl: data.instagramUrl,
      tiktokUrl: data.tiktokUrl,
      followerRange: data.followerRange as any,
    },
  });

  const selectedRange = watch('followerRange');

  const onSubmit = (formData: SocialProofData) => {
    onUpdate(formData);
    onNext();
  };

  const skipStep = () => {
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Show us your work</h2>
        <p className="text-zinc-400">This helps us understand your audience</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Instagram */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Instagram URL <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            {...register('instagramUrl')}
            type="url"
            placeholder="https://instagram.com/yourhandle"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
          />
          {errors.instagramUrl && (
            <p className="mt-1 text-sm text-rose-400">{errors.instagramUrl.message}</p>
          )}
        </div>

        {/* TikTok */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            TikTok URL <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            {...register('tiktokUrl')}
            type="url"
            placeholder="https://tiktok.com/@yourhandle"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
          />
          {errors.tiktokUrl && (
            <p className="mt-1 text-sm text-rose-400">{errors.tiktokUrl.message}</p>
          )}
        </div>

        {/* Follower Range */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Follower Range <span className="text-zinc-500">(optional)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {followerRanges.map((range) => (
              <label
                key={range.value}
                className={`cursor-pointer px-4 py-3 rounded-xl border text-center transition-all ${
                  selectedRange === range.value
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <input
                  {...register('followerRange')}
                  type="radio"
                  value={range.value}
                  className="sr-only"
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>

        {/* Info note */}
        <p className="text-xs text-zinc-500 text-center">
          We review every application to ensure quality fit
        </p>

        {/* Navigation buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
          >
            Continue
          </button>
        </div>

        {/* Skip option */}
        <button
          type="button"
          onClick={skipStep}
          className="w-full text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
        >
          Skip this step →
        </button>
      </form>
    </motion.div>
  );
}
```

### 8. /mainpage/src/components/waitlist/Step5Success.tsx
Success screen with position and share.

```typescript
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Step5SuccessProps {
  data: {
    fullName: string;
    email: string;
  };
}

export function Step5Success({ data }: Step5SuccessProps) {
  const [position, setPosition] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch waitlist position
    fetch('/api/waitlist/position')
      .then(res => res.json())
      .then(data => setPosition(data.position))
      .catch(console.error);
  }, []);

  const shareUrl = 'https://merchfrom.com/waitlist?ref=' + encodeURIComponent(data.email);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`Just joined the waitlist for @merchfrom! Premium AI-powered merch for artists. Join me: ${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-6"
    >
      {/* Celebration animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="relative inline-block"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {/* Confetti effect placeholder */}
        <div className="absolute inset-0 animate-pulse bg-rose-500/30 rounded-full blur-xl" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold text-white mb-2">
          You're on the list!
        </h2>
        <p className="text-zinc-400">
          Thanks, {data.fullName.split(' ')[0]}. We'll be in touch soon.
        </p>
      </motion.div>

      {/* Position number */}
      {position && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800"
        >
          <p className="text-zinc-400 text-sm mb-1">Your position</p>
          <p className="text-5xl font-bold bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
            #{position.toLocaleString()}
          </p>
          <p className="text-zinc-500 text-sm mt-2">
            Estimated wait: 2-3 weeks
          </p>
        </motion.div>
      )}

      {/* What's next */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-left bg-zinc-900/30 rounded-xl p-4 border border-zinc-800"
      >
        <h3 className="font-semibold text-white mb-2">What happens next?</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-500 rounded-full" />
            Check your email for confirmation
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-500 rounded-full" />
            We'll review your application within 48 hours
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-500 rounded-full" />
            Get early access when spots open up
          </li>
        </ul>
      </motion.div>

      {/* Share section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="space-y-3"
      >
        <p className="text-zinc-400 text-sm">Share with other artists</p>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={shareTwitter}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </button>
          
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Email confirmation note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-zinc-500 text-sm"
      >
        Check your email at {data.email} for confirmation
      </motion.p>
    </motion.div>
  );
}
```

### 9. /mainpage/src/app/waitlist/page.tsx
Main waitlist page integrating all steps.

```typescript
'use client';

import { AnimatePresence } from 'framer-motion';
import { WaitlistLayout } from '@/components/waitlist/WaitlistLayout';
import { StepIndicator } from '@/components/waitlist/StepIndicator';
import { Step1Welcome } from '@/components/waitlist/Step1Welcome';
import { Step2BasicInfo } from '@/components/waitlist/Step2BasicInfo';
import { Step3SocialProof } from '@/components/waitlist/Step3SocialProof';
import { Step5Success } from '@/components/waitlist/Step5Success';
import { useWaitlistForm } from '@/hooks/useWaitlistForm';
import dynamic from 'next/dynamic';

// Dynamic import for Step 4 (interview) to avoid SSR issues
const Step4Interview = dynamic(
  () => import('@/components/waitlist/Step4Interview').then(mod => mod.Step4Interview),
  { ssr: false }
);

export default function WaitlistPage() {
  const {
    currentStep,
    formData,
    isSubmitting,
    updateFormData,
    goToStep,
    nextStep,
    prevStep,
    submitForm,
  } = useWaitlistForm();

  return (
    <WaitlistLayout>
      <StepIndicator currentStep={currentStep} />

      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <Step1Welcome key="step1" onStart={nextStep} />
        )}

        {currentStep === 2 && (
          <Step2BasicInfo
            key="step2"
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && (
          <Step3SocialProof
            key="step3"
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 4 && (
          <Step4Interview
            key="step4"
            data={formData}
            onUpdate={updateFormData}
            onNext={async () => {
              await submitForm();
            }}
            onBack={prevStep}
          />
        )}

        {currentStep === 5 && (
          <Step5Success
            key="step5"
            data={{ fullName: formData.fullName, email: formData.email }}
          />
        )}
      </AnimatePresence>
    </WaitlistLayout>
  );
}
```

## Dependencies to Install

```bash
cd /Users/victorbendas/Documents/GitHub/Merch-From/mainpage
bun add framer-motion @hookform/resolvers react-hook-form zod
```

## Testing

After creating all files:
1. Run `bun run build` to check for errors
2. Start dev server: `bun run dev`
3. Navigate to `/waitlist`
4. Test all 5 steps flow
5. Verify form validation
6. Check mobile responsiveness

## Notes

- Step 4 (Interview) is dynamically imported to avoid SSR issues with Web Audio API
- Leopoldo avatar uses Cloudinary URL - ensure this is correct
- Form data persists between steps via useWaitlistForm hook
- Success step fetches position from API (needs /api/waitlist/position endpoint)

## Completion Criteria

- [ ] All files created without TypeScript errors
- [ ] 5-step flow works end-to-end
- [ ] Form validation shows errors correctly
- [ ] Step transitions are smooth (Framer Motion)
- [ ] Mobile responsive
- [ ] Dark mode styling matches design system
- [ ] Leopoldo avatar visible throughout
