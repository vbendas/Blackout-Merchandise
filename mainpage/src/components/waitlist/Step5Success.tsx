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
          You&apos;re on the list!
        </h2>
        <p className="text-zinc-400">
          Thanks, {data.fullName.split(' ')[0]}. We&apos;ll be in touch soon.
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
            We&apos;ll review your application within 48 hours
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
