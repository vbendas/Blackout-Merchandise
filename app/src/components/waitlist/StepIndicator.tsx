'use client';

import { motion } from 'framer-motion';

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: 'Welcome' },
    { number: 2, label: 'Info' },
    { number: 3, label: 'Social' },
    { number: 4, label: 'Interview' },
    { number: 5, label: 'Done' },
  ];

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#18181b',
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  ${isCompleted || isActive ? 'text-white' : 'text-zinc-500'}
                  ${!isCompleted && !isActive ? 'border-2 border-zinc-800' : ''}
                `}
              >
                {isCompleted ? '✓' : step.number}
              </motion.div>
              <span
                className={`text-xs mt-2 ${
                  isActive ? 'text-white font-medium' : isCompleted ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div className="flex-1 h-0.5 mx-2">
                <div
                  className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                  style={{
                    width: isCompleted ? '100%' : currentStep > step.number ? '100%' : '0%',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
