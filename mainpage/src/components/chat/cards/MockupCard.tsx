'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface MockupCardProps {
  imageUrl: string;
  productName?: string;
  variations?: string[];
  onApprove?: () => void;
  onReject?: () => void;
  onRequestChanges?: (feedback: string) => void;
  onClick?: () => void;
}

export function MockupCard({
  imageUrl,
  productName = 'Product Mockup',
  variations = [],
  onApprove,
  onReject,
  onRequestChanges,
  onClick,
}: MockupCardProps) {
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleRequestChanges = () => {
    if (feedback.trim() && onRequestChanges) {
      onRequestChanges(feedback);
      setShowFeedback(false);
      setFeedback('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800 rounded-xl p-4 max-w-[90%] border border-zinc-700"
    >
      <p className="text-white font-medium mb-3">{productName}</p>

      <div 
        className="relative aspect-square rounded-lg overflow-hidden mb-3"
      >
        <button
          onClick={onClick}
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label="Click to enlarge"
        />
        <Image
          src={imageUrl}
          alt={productName}
          fill
          className="object-cover hover:scale-105 transition-transform"
        />
        
        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 hover:opacity-100 text-white text-sm bg-black/50 px-2 py-1 rounded">
            Click to enlarge
          </span>
        </div>
      </div>

      {variations.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {variations.map((variation, index) => (
            <button
              key={variation}
              onClick={() => setSelectedVariation(index)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                selectedVariation === index
                  ? 'bg-rose-600 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {variation}
            </button>
          ))}
        </div>
      )}

      {showFeedback && (
        <div className="mb-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what you'd like to change..."
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowFeedback(false)}
              className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={!feedback.trim()}
              className="px-3 py-1 text-xs bg-zinc-600 text-white rounded hover:bg-zinc-500 disabled:opacity-50"
            >
              Send Feedback
            </button>
          </div>
        </div>
      )}

      {!showFeedback && (
        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="flex-1 px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Request Changes
          </button>
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
        </div>
      )}
    </motion.div>
  );
}
