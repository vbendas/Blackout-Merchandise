'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@heroui/react';
import { RecordingButton } from './RecordingButton';
import { AudioWaveform } from './AudioWaveform';
import { useAudioRecording, formatDuration } from '@/hooks/useAudioRecording';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import { interviewQuestions, InterviewResponse } from '@/lib/waitlist/interview-questions';

interface ContinuousVoiceInterviewProps {
  fullName: string;
  onComplete: (responses: InterviewResponse[]) => void;
  onSwitchToText: (responses: InterviewResponse[]) => void;
  initialResponses?: InterviewResponse[];
}

type Phase = 'intro' | 'listening' | 'processing' | 'responding' | 'complete';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function ContinuousVoiceInterview({
  fullName,
  onComplete,
  onSwitchToText,
  initialResponses = [],
}: ContinuousVoiceInterviewProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(interviewQuestions[0].id);
  const [responses, setResponses] = useState<InterviewResponse[]>(initialResponses);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    audioDuration,
    error: _recordingError,
    startRecording,
    stopRecording,
    getBase64Audio,
    resetRecording,
  } = useAudioRecording();

  const { isPlaying, playAudio } = useAudioPlayback();

  const startConversationRef = useRef<() => Promise<void>>(async () => {});
  const processVoiceResponseRef = useRef<() => Promise<void>>(async () => {});
  const handleStopRecordingRef = useRef<() => Promise<void>>(async () => {});

  const handleStartRecording = useCallback(async () => {
    setError(null);
    await startRecording();
  }, [startRecording]);

  handleStopRecordingRef.current = useCallback(async () => {
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isRecording && audioDuration > 30000) {
      handleStopRecordingRef.current();
    }
  }, [isRecording, audioDuration]);

  useEffect(() => {
    if (phase === 'intro') {
      startConversationRef.current();
    }
  }, [phase]);

  useEffect(() => {
    if (!isRecording && audioDuration > 0 && phase === 'listening') {
      processVoiceResponseRef.current();
    }
  }, [isRecording, audioDuration, phase]);

  startConversationRef.current = async () => {
    setPhase('processing');
    setError(null);

    try {
      const response = await fetch('/api/waitlist/voice-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'initial',
          fullName,
          previousResponses: responses,
        }),
      });

      const data = await response.json();

      if (data.fallbackToText) {
        setError('Voice mode unavailable. Switching to text mode.');
        setTimeout(() => onSwitchToText(responses), 2000);
        return;
      }

      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        text: data.aiText,
      }]);

      if (data.aiAudio) {
        setPhase('responding');
        try {
          await playAudio(data.aiAudio);
        } catch (e) {
          console.error('Audio playback failed:', e);
        }
      }

      setCurrentQuestionId(data.nextQuestionId || currentQuestionId);
      setPhase('listening');

    } catch (err) {
      console.error('Start conversation error:', err);
      setError('Connection issue. Try again or switch to text mode.');
      setPhase('listening');
    }
  };

  processVoiceResponseRef.current = async () => {
    setPhase('processing');

    try {
      const base64Audio = await getBase64Audio();

      const response = await fetch('/api/waitlist/voice-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'continue',
          audio: base64Audio,
          questionId: currentQuestionId,
          previousResponses: responses,
        }),
      });

      const data = await response.json();

      if (data.fallbackToText) {
        setError('Voice mode unavailable. Switching to text mode.');
        setTimeout(() => onSwitchToText(responses), 2000);
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: data.userText,
      };
      setMessages(prev => [...prev, userMessage]);

      const currentQuestion = interviewQuestions.find(q => q.id === currentQuestionId);
      if (currentQuestion) {
        const newResponse: InterviewResponse = {
          questionId: currentQuestionId,
          question: currentQuestion.question,
          response: data.userText,
          timestamp: Date.now(),
        };
        setResponses(prev => [...prev, newResponse]);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.aiText,
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.aiAudio) {
        setPhase('responding');
        try {
          await playAudio(data.aiAudio);
        } catch (e) {
          console.error('Audio playback failed:', e);
        }
      }

      if (data.isComplete) {
        setPhase('complete');
        setTimeout(() => {
          onComplete([...responses, {
            questionId: currentQuestionId,
            question: currentQuestion?.question || '',
            response: data.userText,
            timestamp: Date.now(),
          }]);
        }, 3000);
      } else {
        if (data.nextQuestionId) {
          setCurrentQuestionId(data.nextQuestionId);
        }
        setPhase('listening');
      }

    } catch (err) {
      console.error('Process voice error:', err);
      setError('Something went wrong. Try again.');
      setPhase('listening');
    } finally {
      resetRecording();
    }
  };

  const getLeopoldoAvatar = () => {
    const isSpeaking = phase === 'responding' || isPlaying;
    const expression = isSpeaking ? 'speaking_a' : 'neutral';
    return `https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/leopoldo/${expression}_attr1_subject.png`;
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Voice Interview</h2>
        <button
          onClick={() => onSwitchToText(responses)}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Switch to Text
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <Avatar
                  src={getLeopoldoAvatar()}
                  className="w-8 h-8 mr-2 flex-shrink-0"
                />
              )}
              
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-rose-600 text-white rounded-br-md'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {phase === 'processing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <Avatar
              src={getLeopoldoAvatar()}
              className="w-8 h-8 mr-2"
            />
            <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                    className="w-2 h-2 bg-zinc-500 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <AudioWaveform 
            isRecording={isRecording} 
            isPlaying={phase === 'responding' || isPlaying}
          />
        </div>

        <div className="flex justify-center">
          <RecordingButton
            isRecording={isRecording}
            onStart={handleStartRecording}
            onStop={handleStopRecordingRef.current}
            disabled={phase === 'processing' || phase === 'responding' || phase === 'complete'}
          />
        </div>

        <p className="text-center text-zinc-400 text-sm">
          {phase === 'intro' && 'Connecting to Leopoldo...'}
          {phase === 'listening' && (isRecording ? 'Listening...' : 'Tap to speak')}
          {phase === 'processing' && 'Processing...'}
          {phase === 'responding' && 'Leopoldo is speaking...'}
          {phase === 'complete' && 'Interview complete!'}
        </p>

        {isRecording && (
          <p className="text-center text-rose-400 font-mono">
            {formatDuration(audioDuration)}
          </p>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
