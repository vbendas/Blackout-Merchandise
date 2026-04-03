'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { basicInfoSchema, BasicInfoData } from '@/lib/validation/waitlist';

interface Step2BasicInfoProps {
  data: { fullName: string; email: string; artistName?: string };
  onUpdate: (data: Partial<{ fullName: string; email: string; artistName?: string }>) => void;
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
        <h2 className="text-2xl font-bold text-white mb-2">Let&apos;s get to know you</h2>
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
