'use client';

import { useState, useCallback } from 'react';

import { InterviewResponse } from '@/lib/waitlist/interview-questions';

export interface WaitlistFormData {
  fullName: string;
  email: string;
  artistName?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  followerRange?: string;
  interviewResponses?: InterviewResponse[];
}

const initialFormData: WaitlistFormData = {
  fullName: '',
  email: '',
  artistName: '',
  instagramUrl: '',
  tiktokUrl: '',
  followerRange: '',
};

export function useWaitlistForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WaitlistFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = useCallback((updates: Partial<WaitlistFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const submitForm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Submission failed');
      
      nextStep(); // Go to success step
    } catch (error) {
      console.error('Submit error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, nextStep]);

  return {
    currentStep,
    formData,
    isSubmitting,
    updateFormData,
    goToStep,
    nextStep,
    prevStep,
    submitForm,
  };
}
