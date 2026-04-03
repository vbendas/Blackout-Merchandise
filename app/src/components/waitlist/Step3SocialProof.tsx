'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Step3SocialProofProps {
  data: {
    socialLink?: string;
    followerRange?: string;
  };
  onUpdate: (data: { socialLink?: string; followerRange?: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3SocialProof({ data, onUpdate, onNext, onBack }: Step3SocialProofProps) {
  const [socialLink, setSocialLink] = useState(data.socialLink || '');
  const [followerRange, setFollowerRange] = useState(data.followerRange || '');

  const followerRanges = ['1k-5k', '5k-10k', '10k-50k', '50k-100k', '100k+'];

  const handleNext = () => {
    onUpdate({ socialLink, followerRange });
    onNext();
  };

  const handleSkip = () => {
    onUpdate({ socialLink: '', followerRange: '' });
    onNext();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Social Proof</h2>
        <p className="text-zinc-400">Help us understand your reach (optional).</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="social-link" className="block text-sm font-medium text-zinc-300 mb-2">
              Social Media Link
            </label>
            <Input
              id="social-link"
              type="url"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              placeholder="https://instagram.com/yourprofile"
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-1">Instagram, TikTok, YouTube, or website</p>
          </div>

          <div>
            <label htmlFor="follower-range" className="block text-sm font-medium text-zinc-300 mb-2">
              Follower Range
            </label>
            <Select value={followerRange} onValueChange={setFollowerRange}>
              <SelectTrigger id="follower-range" className="bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Select your follower range" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {followerRanges.map((range) => (
                  <SelectItem key={range} value={range} className="text-white">
                    {range}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-3 pt-4"
      >
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          variant="outline"
          onClick={handleSkip}
          className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          Skip
          <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-2" />
        </Button>
        <Button onClick={handleNext} className="flex-1 bg-white text-black hover:bg-zinc-200">
          Continue
          <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
