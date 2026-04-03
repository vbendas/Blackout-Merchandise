'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface FormCardProps {
  question: string;
  type: 'text' | 'single_choice' | 'email' | 'number';
  options?: string[];
  currentStep?: number;
  totalSteps?: number;
  onSubmit: (answer: string) => void;
  onSkip?: () => void;
}

export function FormCard({
  question,
  type,
  options = [],
  currentStep,
  totalSteps,
  onSubmit,
  onSkip,
}: FormCardProps) {
  const [value, setValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const answer = type === 'single_choice' ? (selectedOption || value) : value;
    
    if (!answer.trim()) {
      setError('Please enter an answer');
      return;
    }

    // Validate email
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) {
      setError('Please enter a valid email');
      return;
    }

    onSubmit(answer);
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    setError('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800 rounded-xl p-4 max-w-[90%] border border-zinc-700"
    >
      {/* Progress indicator */}
      {currentStep && totalSteps && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-rose-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Question */}
      <p className="text-white font-medium mb-4">{question}</p>

      {/* Single Choice Options */}
      {type === 'single_choice' && options.length > 0 && (
        <div className="space-y-2 mb-4">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionSelect(option)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedOption === option
                  ? 'bg-rose-600 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Text Input */}
      {type !== 'single_choice' && (
        <input
          type={type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          placeholder={
            type === 'email' ? 'your@email.com' :
            type === 'number' ? 'Enter a number' :
            'Type your answer...'
          }
          className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 mb-4"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Skip
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
