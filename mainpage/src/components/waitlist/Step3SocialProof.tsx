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
  onUpdate: (data: Partial<{ instagramUrl?: string; tiktokUrl?: string; followerRange?: string }>) => void;
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
      followerRange: data.followerRange as '1k-5k' | '5k-10k' | '10k-50k' | '50k-100k' | '100k+' | undefined,
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
