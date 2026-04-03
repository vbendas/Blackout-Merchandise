'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@heroui/react';
import { 
  interviewQuestions, 
  getQuestionById,
  InterviewResponse
} from '@/lib/waitlist/interview-questions';
import { InterviewModeSelector } from './InterviewModeSelector';
import { ContinuousVoiceInterview } from './ContinuousVoiceInterview';

interface Step4InterviewProps {
  data: {
    fullName: string;
    email: string;
  };
  onUpdate: (data: { interviewResponses?: InterviewResponse[] }) => void;
  onNext: () => void;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function Step4Interview({ data, onUpdate, onNext, onBack }: Step4InterviewProps) {
  const [selectionPhase, setSelectionPhase] = useState<'choosing' | 'text' | 'voice'>('choosing');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(interviewQuestions[0].id);
  const [interviewResponses, setInterviewResponses] = useState<InterviewResponse[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [leopoldoExpression, setLeopoldoExpression] = useState('neutral');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    }]);
  }, []);

  const handleInitialGreeting = useCallback(async () => {
    setIsLoading(true);
    setLeopoldoExpression('speaking');
    
    try {
      const response = await fetch('/api/waitlist/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: interviewQuestions[0].id,
          previousResponses: [],
          userResponse: '',
        }),
      });

      const result = await response.json();
      
      addMessage('assistant', result.response);
      setLeopoldoExpression('neutral');
    } catch (err) {
      console.error('Initial greeting error:', err);
      addMessage('assistant', `Ola ${data.fullName.split(' ')[0]}! I'm Leopoldo. I'm excited to learn about your merch goals. Let's start: ${interviewQuestions[0].question}`);
      setLeopoldoExpression('neutral');
    } finally {
      setIsLoading(false);
    }
  }, [data.fullName, addMessage]);

  useEffect(() => {
    if (selectionPhase === 'text' && messages.length === 0) {
      handleInitialGreeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionPhase]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);
    
    setIsLoading(true);
    setLeopoldoExpression('thinking');

    try {
      const question = getQuestionById(currentQuestionId)!;
      const newResponse: InterviewResponse = {
        questionId: currentQuestionId,
        question: question.question,
        response: userMessage,
        timestamp: Date.now(),
      };

      const updatedResponses = [...interviewResponses, newResponse];
      setInterviewResponses(updatedResponses);

      const response = await fetch('/api/waitlist/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestionId,
          previousResponses: updatedResponses,
          userResponse: userMessage,
        }),
      });

      const responseData = await response.json();
      
      addMessage('assistant', responseData.response);
      
      if (responseData.isComplete) {
        setLeopoldoExpression('happy');
        setIsComplete(true);
        onUpdate({ interviewResponses: updatedResponses });
        setTimeout(onNext, 2000);
      } else {
        setLeopoldoExpression('neutral');
        if (responseData.nextQuestionId) {
          setCurrentQuestionId(responseData.nextQuestionId);
        }
      }

    } catch (error) {
      console.error('Interview error:', error);
      addMessage('assistant', "I'm sorry, I'm having trouble connecting. Let's try again - what would you like to share?");
      setLeopoldoExpression('confused');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleModeSelect = (mode: 'text' | 'voice') => {
    setSelectionPhase(mode);
  };

  const handleVoiceComplete = (responses: InterviewResponse[]) => {
    setInterviewResponses(responses);
    onUpdate({ interviewResponses: responses });
    onNext();
  };

  const handleSwitchToText = (responses: InterviewResponse[]) => {
    setInterviewResponses(responses);
    setSelectionPhase('text');
  };

  const getLeopoldoAvatar = () => {
    const expressions: Record<string, string> = {
      neutral: 'neutral',
      speaking: 'speaking_a',
      thinking: 'thinking',
      happy: 'happy',
      confused: 'confused',
    };
    
    return `https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/leopoldo/${expressions[leopoldoExpression]}_attr1_subject.png`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-[600px]"
    >
      <AnimatePresence mode="wait">
        {/* Mode Selection Screen */}
        {selectionPhase === 'choosing' && (
          <motion.div
            key="choosing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <InterviewModeSelector onSelect={handleModeSelect} />
            
            <div className="mt-8 flex justify-center">
              <button
                onClick={onBack}
                className="px-6 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Back
              </button>
            </div>
          </motion.div>
        )}

        {/* Text Mode Chat */}
        {selectionPhase === 'text' && (
          <motion.div
            key="text"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Chat Interview</h2>
              <button
                onClick={() => setSelectionPhase('choosing')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Change Mode
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
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
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

            <div className="text-center text-xs text-zinc-500 mb-3">
              Question {interviewResponses.length + 1} of {interviewQuestions.length}
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response..."
                  disabled={isLoading || isComplete}
                  className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isLoading || isComplete}
                  className="px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectionPhase('choosing')}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                {isComplete && (
                  <button
                    onClick={onNext}
                    className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Voice Mode */}
        {selectionPhase === 'voice' && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <ContinuousVoiceInterview
              fullName={data.fullName}
              onComplete={handleVoiceComplete}
              onSwitchToText={handleSwitchToText}
              initialResponses={interviewResponses}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
