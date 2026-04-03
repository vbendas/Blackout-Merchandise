'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RecordingIndicator } from '@/components/ui/RecordingIndicator';
import { Textarea } from '@/components/ui/textarea';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { interviewQuestions } from '@/lib/waitlist/interview-questions';

interface Step4InterviewProps {
  data: {
    interviewResponses?: Record<number, string>;
  };
  onUpdate: (data: { interviewResponses: Record<number, string> }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step4Interview({ data, onUpdate, onNext, onBack }: Step4InterviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>(data.interviewResponses || {});
  const [error, setError] = useState<string | null>(null);

  // Speech-to-text hook
  const { isRecording, startRecording, stopRecording } = useSpeechToText({
    onTranscript: (text) => {
      setResponses((prev) => ({
        ...prev,
        [currentQuestionIndex]: text,
      }));
    },
    onError: (errorMsg) => {
      setError(errorMsg);
    },
  });

  const currentQuestion = interviewQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === interviewQuestions.length - 1;
  const currentResponse = responses[currentQuestionIndex] || '';

  const handleNext = () => {
    if (!currentResponse.trim()) {
      setError('Please provide a response before continuing');
      return;
    }

    setError(null);

    if (isLastQuestion) {
      // All questions answered
      onUpdate({ interviewResponses: responses });
      onNext();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex === 0) {
      onBack();
    } else {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Auto-focus textarea when question changes
  useEffect(() => {
    const textarea = document.getElementById('interview-response');
    if (textarea) {
      textarea.focus();
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>
            Question {currentQuestionIndex + 1} of {interviewQuestions.length}
          </span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / interviewQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white">{currentQuestion.question}</h2>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm"
          >
            {error}
          </motion.div>
        )}
      </motion.div>

      {/* Response Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex gap-2 items-start">
          {/* Mic Button */}
          <Button
            size="icon"
            variant={isRecording ? 'default' : 'outline'}
            onClick={isRecording ? stopRecording : startRecording}
            className={
              isRecording
                ? 'bg-red-500 hover:bg-red-600 border-red-500 shrink-0'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white shrink-0'
            }
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Icon icon="lucide:mic" className="w-4 h-4" />
          </Button>

          {/* Textarea */}
          <div className="flex-1 space-y-2">
            <Textarea
              id="interview-response"
              value={currentResponse}
              onChange={(e) => {
                setResponses((prev) => ({
                  ...prev,
                  [currentQuestionIndex]: e.target.value,
                }));
                setError(null);
              }}
              placeholder={currentQuestion.placeholder}
              className="min-h-[120px] bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-600 resize-none"
              disabled={isRecording}
            />

            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-2">
                <RecordingIndicator isRecording={isRecording} />
                <span className="text-xs text-zinc-400">Recording...</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-500">{currentResponse.length}/1000 characters</p>
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
          onClick={handleBack}
          className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!currentResponse.trim()}
          className="flex-1 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastQuestion ? 'Complete' : 'Next'}
          <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
