'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Step5SuccessProps {
  data: {
    email?: string;
    name?: string;
  };
}

export function Step5Success({ data }: Step5SuccessProps) {
  const [position, setPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch waitlist position
    const fetchPosition = async () => {
      if (!data.email) return;

      try {
        const response = await fetch(`/api/waitlist?email=${encodeURIComponent(data.email)}`);
        const result = await response.json();

        if (result.success && result.data) {
          setPosition(result.data.position);
        }
      } catch (error) {
        console.error('Failed to fetch position:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosition();
  }, [data.email]);

  const copyToClipboard = () => {
    const text = `I just joined Blackout Merchandise waitlist! 🎉\n${window.location.origin}/waitlist`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 text-center">
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mb-4"
      >
        <Icon icon="lucide:check" className="w-10 h-10 text-emerald-400" />
      </motion.div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-3xl font-bold text-white">Application Received!</h1>
        <p className="text-lg text-zinc-400">
          Thanks for applying, <span className="text-white font-medium">{data.name}</span>!
        </p>
        <p className="text-zinc-400">We'll review your application and get back to you soon.</p>
      </motion.div>

      {/* Waitlist Position */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="py-6"
      >
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-zinc-800 rounded w-32 mx-auto" />
            <div className="h-4 bg-zinc-800 rounded w-48 mx-auto" />
          </div>
        ) : position ? (
          <div className="space-y-2">
            <div className="text-4xl font-bold text-white">#{position}</div>
            <div className="text-sm text-zinc-400">Your position in the waitlist</div>
            <div className="text-xs text-zinc-500">We'll notify you when your spot is ready</div>
          </div>
        ) : (
          <div className="text-zinc-400">Position will be assigned shortly</div>
        )}
      </motion.div>

      {/* Share & Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4 pt-4"
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={copyToClipboard}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Icon icon="lucide:copy" className="w-4 h-4 mr-2" />
            Copy Invite Link
          </Button>
          <Link href="/app" className="flex-1">
            <Button className="w-full bg-white text-black hover:bg-zinc-200">
              <Icon icon="lucide:arrow-right" className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-xs text-zinc-500 pt-2">Share your referral link to move up the waitlist!</p>
      </motion.div>
    </div>
  );
}
