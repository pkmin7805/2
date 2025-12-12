import React from 'react';
import { AppStep } from '../types';

interface StepWizardProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.CATEGORY_SELECTION, label: '카테고리 선정' },
  { id: AppStep.TOPIC_SELECTION, label: '주제 선택' },
  { id: AppStep.GENERATING, label: '글 작성 중' },
  { id: AppStep.RESULT, label: '완료' },
];

export const StepWizard: React.FC<StepWizardProps> = ({ currentStep }) => {
  return (
    <div className="w-full max-w-3xl mx-auto mb-12">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
        <div 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary-600 -z-10 transition-all duration-500 ease-in-out"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((step) => {
          const isActive = currentStep >= step.id;
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-4 
                  ${isActive ? 'bg-primary-600 text-white border-primary-100' : 'bg-white text-gray-400 border-gray-200'}
                  ${isCurrent ? 'ring-4 ring-primary-100 scale-110' : ''}
                `}
              >
                {step.id + 1}
              </div>
              <span className={`mt-2 text-xs font-medium ${isActive ? 'text-primary-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
