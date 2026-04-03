'use client';

import { useCallback, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AGENT_NAME = 'Antônia';
const AGENT_COLOR = '#3B82F6';

export function useVisitorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode((prev) => !prev);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsTyping(true);

      try {
        const response = await fetch('/api/chat/visitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            history: messages.slice(-10),
          }),
        });

        if (!response.ok) throw new Error('Chat request failed');

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (isVoiceMode && data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          setIsSpeaking(true);
          audio.onended = () => setIsSpeaking(false);
          audio.play();
        }
      } catch (error) {
        console.error('Chat error:', error);
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Desculpe, houve um erro. Tente novamente.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [messages, isVoiceMode]
  );

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        setIsListening(false);
        setIsTyping(true);

        try {
          const response = await fetch('/api/chat/visitor/voice', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Voice request failed');

          const data = await response.json();

          const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: data.transcription,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, userMessage]);

          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);

          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            audio.play();
          }
        } catch (error) {
          console.error('Voice processing error:', error);
        } finally {
          setIsTyping(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isOpen,
    isVoiceMode,
    isListening,
    isSpeaking,
    isTyping,
    messages,
    inputValue,
    setInputValue,
    toggleChat,
    toggleVoiceMode,
    sendMessage,
    startListening,
    stopListening,
    agentName: AGENT_NAME,
    agentColor: AGENT_COLOR,
  };
}
