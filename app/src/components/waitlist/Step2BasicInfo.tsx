'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { waitlistBasicInfoSchema } from '@/lib/validation/waitlist';

interface Step2BasicInfoProps {
  data: {
    name?: string;
    email?: string;
  };
  onUpdate: (data: { name?: string; email?: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2BasicInfo({ data, onUpdate, onNext, onBack }: Step2BasicInfoProps) {
  const [name, setName] = useState(data.name || '');
  const [email, setEmail] = useState(data.email || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    try {
      waitlistBasicInfoSchema.parse({ name, email });
      setErrors({});
      return true;
    } catch (error: any) {
      const newErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        if (err.path[0]) {
          newErrors[err.path[0]] = err.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
  };

  const handleNext = () => {
    if (validate()) {
      onUpdate({ name, email });
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Basic Information</h2>
        <p className="text-zinc-400">Let's start with the basics.</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
              Your Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className={`bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-600 ${
                errors.name ? 'border-red-500' : ''
              }`}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
              Email Address <span className="text-red-400">*</span>
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className={`bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-600 ${
                errors.email ? 'border-red-500' : ''
              }`}
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
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
          onClick={handleNext}
          disabled={!name || !email}
          className="flex-1 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
