/**
 * Print Preparation Modal
 * Shows progress of generating print-ready TIFF file
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Download, FileImage, Loader2, Palette, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrintPreparationModalProps {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  progress: number;
  fileName?: string;
  onDownload?: () => void;
  onClose?: () => void;
}

const STEPS = [
  { icon: FileImage, label: 'Downloading transformed image...' },
  { icon: Palette, label: 'Separating colors...' },
  { icon: Printer, label: 'Generating halftones (45 LPI)...' },
  { icon: Download, label: 'Creating TIFF file...' },
  { icon: Check, label: 'Adding registration marks...' },
];

export function PrintPreparationModal({
  isOpen,
  currentStep,
  totalSteps,
  stepLabel,
  progress,
  fileName,
  onDownload,
  onClose,
}: PrintPreparationModalProps) {
  const isComplete = currentStep >= totalSteps;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'bg-zinc-900 border border-zinc-700/50 rounded-2xl p-8 shadow-2xl',
              'w-full max-w-md z-50'
            )}
          >
            {!isComplete ? (
              <>
                {/* Processing State */}
                <div className="text-center mb-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="inline-flex"
                  >
                    <Loader2 className="w-12 h-12 text-blue-500" />
                  </motion.div>
                  <h3 className="mt-4 text-xl font-semibold text-zinc-100">Preparing for Print</h3>
                  <p className="mt-2 text-sm text-zinc-400">{stepLabel}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>
                      Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                  {STEPS.slice(0, totalSteps).map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isDone = index < currentStep;

                    return (
                      <motion.div
                        key={index}
                        initial={false}
                        animate={{
                          opacity: isDone ? 0.5 : 1,
                          x: isActive ? 4 : 0,
                        }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg transition-colors',
                          isActive && 'bg-blue-500/10 border border-blue-500/20',
                          isDone && 'text-zinc-500'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            isDone
                              ? 'bg-green-500/20 text-green-500'
                              : isActive
                                ? 'bg-blue-500/20 text-blue-500'
                                : 'bg-zinc-800 text-zinc-500'
                          )}
                        >
                          {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <span className={cn('text-sm', isActive ? 'text-zinc-200 font-medium' : 'text-zinc-400')}>
                          {step.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Complete State */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4"
                  >
                    <Check className="w-8 h-8 text-green-500" />
                  </motion.div>

                  <h3 className="text-xl font-semibold text-zinc-100">Print-Ready File Generated!</h3>

                  {fileName && <p className="mt-2 text-sm text-zinc-400 font-mono">{fileName}</p>}

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={onDownload}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg',
                        'bg-blue-600 hover:bg-blue-500 text-white font-medium',
                        'transition-colors'
                      )}
                    >
                      <Download className="w-4 h-4" />
                      Download TIFF File
                    </button>

                    <button
                      onClick={onClose}
                      className="w-full py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      Continue to Approval
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
