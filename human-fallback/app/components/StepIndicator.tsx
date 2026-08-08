'use client';

import React from 'react';
import { Bot, User, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

export type StepStatus = 'idle' | 'active' | 'success' | 'failed' | 'pending';

interface Step {
  id: string;
  label: string;
  description: string;
  icon: 'bot' | 'human';
  status: StepStatus;
}

interface StepIndicatorProps {
  steps: Step[];
}

const statusStyles: Record<StepStatus, string> = {
  idle: 'border-gray-700 bg-gray-900 text-gray-500',
  active: 'border-accent bg-accent/10 text-accent pulse-glow',
  success: 'border-green-500 bg-green-500/10 text-green-400',
  failed: 'border-red-500 bg-red-500/10 text-red-400',
  pending: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
};

const StatusIcon = ({ status }: { status: StepStatus }) => {
  switch (status) {
    case 'active':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'success':
      return <CheckCircle className="w-4 h-4" />;
    case 'failed':
      return <XCircle className="w-4 h-4" />;
    case 'pending':
      return <Clock className="w-4 h-4" />;
    default:
      return null;
  }
};

export default function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={`flex-1 rounded-lg border p-4 transition-all duration-300 ${statusStyles[step.status]}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                {step.icon === 'bot' ? (
                  <Bot className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="font-semibold text-sm">{step.label}</span>
              </div>
              <StatusIcon status={step.status} />
            </div>
            <p className="text-xs opacity-70">{step.description}</p>
          </div>
          {index < steps.length - 1 && (
            <div className="hidden sm:flex items-center text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
