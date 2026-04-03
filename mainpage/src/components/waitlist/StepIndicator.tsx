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
