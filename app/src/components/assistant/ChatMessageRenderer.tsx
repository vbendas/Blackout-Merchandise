'use client';

import type { Message } from '@/lib/ChatContext';
import {
  ColorSeparationCard,
  ImageMessageCard,
  InlineActionButtons,
  PriceSummaryCard,
  TransformationResultCard,
  UploadPromptCard,
} from './cards';

interface ChatMessageRendererProps {
  message: Message;
  onAction?: (actionText: string) => void;
}

export function ChatMessageRenderer({ message, onAction }: ChatMessageRendererProps) {
  const { content, attachment } = message;

  // If no attachment, render plain text only
  if (!attachment) {
    return content ? <p className="text-sm leading-relaxed break-words">{content}</p> : null;
  }

  // Render based on attachment type
  const renderCard = () => {
    switch (attachment.type) {
      case 'image':
        return (
          <ImageMessageCard
            imageUrl={attachment.imageUrl || ''}
            alt={content}
            badge={attachment.imageUrl?.includes('placehold') ? 'ai-generated' : 'uploaded'}
          />
        );

      case 'mockup':
        return <ImageMessageCard imageUrl={attachment.imageUrl || ''} alt="Product mockup" />;

      case 'upload-prompt':
        return (
          <UploadPromptCard
            onFileSelected={(file) => {
              // Create blob URL and trigger file upload flow
              const blobUrl = URL.createObjectURL(file);
              if (onAction) {
                // Send special message to trigger upload flow
                onAction(`__FILE_UPLOADED__|${blobUrl}|${file.name}`);
              }
            }}
          />
        );

      case 'transformation':
        return (
          <TransformationResultCard
            beforeUrl={attachment.beforeUrl || ''}
            afterUrl={attachment.afterUrl || ''}
            transformationName={attachment.transformationName || 'Transformation'}
          />
        );

      case 'price-summary':
        return attachment.pricingData ? (
          <PriceSummaryCard
            basePrice={attachment.pricingData.basePrice}
            placementPrice={attachment.pricingData.placementPrice}
            colorPrice={attachment.pricingData.colorPrice}
            total={attachment.pricingData.total}
            breakdown={attachment.pricingData.breakdown}
          />
        ) : null;

      case 'color-separation':
        return attachment.colorData ? <ColorSeparationCard colors={attachment.colorData} /> : null;

      case 'action-buttons':
        // Action buttons are rendered separately below
        return null;

      case 'product-select':
        // Use existing ProductCardInline or render placeholder
        return attachment.productData ? (
          <div className="w-full rounded-xl border border-white/10 bg-zinc-800/50 p-4">
            <img
              src={attachment.productData.imageUrl}
              alt={attachment.productData.name}
              className="w-full h-32 object-cover rounded-lg mb-2"
            />
            <p className="text-sm font-medium text-white">{attachment.productData.name}</p>
            <p className="text-xs text-zinc-500">€{attachment.productData.price}</p>
          </div>
        ) : null;

      case 'text':
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Text content */}
      {content && <p className="text-sm leading-relaxed break-words">{content}</p>}

      {/* Card */}
      {renderCard()}

      {/* Action buttons (for any attachment type that has them) */}
      {attachment.actions && attachment.actions.length > 0 && onAction && (
        <InlineActionButtons actions={attachment.actions} onAction={onAction} />
      )}
    </div>
  );
}
