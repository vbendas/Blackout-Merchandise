'use client';

import { useState } from 'react';
import { Step1Welcome } from '@/components/waitlist/Step1Welcome';
import { Step2BasicInfo } from '@/components/waitlist/Step2BasicInfo';
import { Step3SocialProof } from '@/components/waitlist/Step3SocialProof';
import { Step4Interview } from '@/components/waitlist/Step4Interview';
import { Step5Success } from '@/components/waitlist/Step5Success';
import { StepIndicator } from '@/components/waitlist/StepIndicator';
import { WaitlistLayout } from '@/components/waitlist/WaitlistLayout';

export default function WaitlistPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<{
    name?: string;
    email?: string;
    socialLink?: string;
    followerRange?: string;
    interviewResponses?: Record<number, string>;
  }>({});

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <WaitlistLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <StepIndicator currentStep={currentStep} />

          <div className="mt-8">
            {currentStep === 1 && <Step1Welcome onNext={handleNext} />}

            {currentStep === 2 && (
              <Step2BasicInfo data={formData} onUpdate={updateFormData} onNext={handleNext} onBack={handleBack} />
            )}

            {currentStep === 3 && (
              <Step3SocialProof data={formData} onUpdate={updateFormData} onNext={handleNext} onBack={handleBack} />
            )}

            {currentStep === 4 && (
              <Step4Interview data={formData} onUpdate={updateFormData} onNext={handleNext} onBack={handleBack} />
            )}

            {currentStep === 5 && <Step5Success data={formData} />}
          </div>
        </div>
      </WaitlistLayout>
    </div>
  );
}
