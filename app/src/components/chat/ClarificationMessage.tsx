'use client';

import React from 'react';
import type { AgentId, ClarificationOption } from '@/types/chat';

interface ClarificationMessageProps {
  options: ClarificationOption[];
  onSelect: (agent: AgentId) => void;
}

export function ClarificationMessage({ options, onSelect }: ClarificationMessageProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 my-2">
      <p className="text-zinc-300 mb-3 text-sm">
        I want to make sure I connect you with the right person. What would you like help with?
      </p>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.agent}
            onClick={() => onSelect(option.agent)}
            className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
          >
            <div className="font-semibold text-white text-sm">{option.label}</div>
            <div className="text-xs text-zinc-400">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
