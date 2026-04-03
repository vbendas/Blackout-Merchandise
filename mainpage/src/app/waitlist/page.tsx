'use client';

import { AnimatePresence } from 'framer-motion';
import { WaitlistLayout } from '@/components/waitlist/WaitlistLayout';
import { StepIndicator } from '@/components/waitlist/StepIndicator';
import { Step1Welcome } from '@/components/waitlist/Step1Welcome';
import { Step2BasicInfo } from '@/components/waitlist/Step2BasicInfo';
import { Step3SocialProof } from '@/components/waitlist/Step3SocialProof';
import { Step5Success } from '@/components/waitlist/Step5Success';
import { useWaitlistForm } from '@/hooks/useWaitlistForm';
import { InterviewResponse } from '@/lib/waitlist/interview-questions';
import dynamic from 'next/dynamic';

const Step4Interview = dynamic(
  () => import('@/components/waitlist/Step4Interview').then(mod => mod.Step4Interview),
  { ssr: false }
);

export default function WaitlistPage() {
  const {
    currentStep,
    formData,
    updateFormData,
    nextStep,
    prevStep,
    submitForm,
  } = useWaitlistForm();

  const handleInterviewUpdate = (data: { interviewResponses?: InterviewResponse[] }) => {
    if (data.interviewResponses) {
      updateFormData({ interviewResponses: data.interviewResponses });
    }
  };

  return (
    <WaitlistLayout>
      <StepIndicator currentStep={currentStep} />

      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <Step1Welcome key="step1" onStart={nextStep} />
        )}

        {currentStep === 2 && (
          <Step2BasicInfo
            key="step2"
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && (
          <Step3SocialProof
            key="step3"
            data={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 4 && (
          <Step4Interview
            key="step4"
            data={formData}
            onUpdate={handleInterviewUpdate}
            onNext={async () => {
              await submitForm();
            }}
            onBack={prevStep}
          />
        )}

        {currentStep === 5 && (
          <Step5Success
            key="step5"
            data={{ fullName: formData.fullName, email: formData.email }}
          />
        )}
      </AnimatePresence>
    </WaitlistLayout>
  );
}
