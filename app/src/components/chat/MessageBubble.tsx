'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';
import type { Message, MessageAttachment } from '@/lib/ChatContext';
import { getCloudinaryUrl } from '@/lib/expressions/cloudinary';
import type { AgentName } from '@/types/expressions';
import { DesignCardInline } from './DesignCardInline';
import { MockupCardInline } from './MockupCardInline';
import { ProductCardInline } from './ProductCardInline';

// Agent colors - two colors for Orb gradient
const AGENT_COLORS: Record<string, [string, string]> = {
  Leopoldo: ['#CADCFC', '#A0B9D1'],
  Francisca: ['#E5E7EB', '#D1D5DB'],
  Antônia: ['#9CA3AF', '#6B7280'],
};

// Border colors for avatars (single color)
const AGENT_BORDER_COLORS: Record<string, string> = {
  Leopoldo: '#F59E0B',
  Francisca: '#A855F7',
  Antônia: '#3B82F6',
};

interface MessageBubbleProps {
  message: Message;
  onSendMessage?: (message: string) => void;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Render rich content based on attachment type
function RenderAttachment({
  attachment,
  onSendMessage,
}: {
  attachment: MessageAttachment;
  onSendMessage?: (message: string) => void;
}) {
  switch (attachment.type) {
    case 'product-select': {
      const data = attachment.productData;
      if (!data) return null;
      return (
        <ProductCardInline
          productId={data.id}
          name={data.name}
          imageUrl={data.imageUrl}
          baseCost={data.price}
          suggestedRetail={data.price ? data.price * 5 : undefined}
          colors={data.colors}
        />
      );
    }

    case 'mockup': {
      return (
        <MockupCardInline
          mockupId={attachment.imageUrl || 'unknown'}
          productName="Product Preview"
          mockupUrl={attachment.imageUrl || ''}
          designPreviewUrl={attachment.beforeUrl || ''}
          colors={attachment.colorData?.map((c) => ({ name: c.name, hex: c.hex }))}
        />
      );
    }

    case 'image':
    case 'transformation': {
      const data = attachment;
      return (
        <DesignCardInline
          designId={data.imageUrl || 'unknown'}
          title={data.transformationName || 'Design'}
          imageUrl={data.imageUrl || ''}
        />
      );
    }

    case 'action-buttons': {
      const actions = attachment.actions;
      if (!actions || actions.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              onClick={() => onSendMessage?.(action.action)}
              variant={
                action.variant === 'primary' ? 'default' : action.variant === 'outline' ? 'outline' : 'secondary'
              }
              size="sm"
              className="gap-1.5"
            >
              {action.icon && <Icon icon={action.icon} className="w-4 h-4" />}
              {action.label}
            </Button>
          ))}
        </div>
      );
    }

    case 'price-summary': {
      const pricing = attachment.pricingData;
      if (!pricing) return null;
      return (
        <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white">Price Breakdown</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Base Price</span>
              <span>${(pricing.basePrice / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Placement</span>
              <span>${(pricing.placementPrice / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Colors</span>
              <span>${(pricing.colorPrice / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-500 pt-2 border-t border-zinc-800">
              <span>Total</span>
              <span className="font-semibold text-white">${(pricing.total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      );
    }

    case 'color-separation': {
      const colors = attachment.colorData;
      if (!colors || colors.length === 0) return null;
      return (
        <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white">Color Separation</h4>
          <div className="grid grid-cols-2 gap-2">
            {colors.map((color) => (
              <div key={color.name} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-zinc-600" style={{ backgroundColor: color.hex }} />
                <div className="text-xs">
                  <p className="text-zinc-300">{color.name}</p>
                  <p className="text-zinc-500">{color.pantone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'upload-prompt': {
      return (
        <div className="w-full max-w-sm rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center">
          <Icon icon="lucide:upload" className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
          <p className="text-sm text-zinc-300 mb-3">Drop your design here or click to upload</p>
          <Button variant="outline" size="sm">
            Choose File
          </Button>
        </div>
      );
    }

    default:
      return null;
  }
}

export function MessageBubble({ message, onSendMessage }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { currentExpression } = useAvatarExpression();

  const agentColors: [string, string] = AGENT_COLORS[message.agent as keyof typeof AGENT_COLORS] || [
    '#CADCFC',
    '#A0B9D1',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar for AI messages */}
      {!isUser && (
        <div
          className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2"
          style={{
            borderColor: AGENT_BORDER_COLORS[message.agent] || '#6B7280',
            boxShadow: `0 0 10px 2px ${agentColors[0]}40`,
          }}
        >
          <img
            src={getCloudinaryUrl(message.agent as AgentName, currentExpression || 'neutral', 200)}
            alt={message.agent}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Message content */}
      <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Text content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <span className="mt-1 block text-right text-[10px] text-zinc-400">{formatTime(message.timestamp)}</span>
        </div>

        {/* Rich content attachment */}
        {message.attachment && (
          <div className="mt-2">
            <RenderAttachment attachment={message.attachment} onSendMessage={onSendMessage} />
          </div>
        )}
      </div>

      {/* User avatar placeholder */}
      {isUser && (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-700 flex items-center justify-center">
          <Icon icon="lucide:user" className="w-4 h-4 text-zinc-400" />
        </div>
      )}
    </motion.div>
  );
}
