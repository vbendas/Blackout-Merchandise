'use client';

import { ChatMessage } from '@/types/chat';
import { TextMessage } from './messages/TextMessage';
import { ProductCard } from './cards/ProductCard';
import { MockupCard } from './cards/MockupCard';
import { FormCard } from './cards/FormCard';

interface MessageRendererProps {
  message: ChatMessage;
  showAgent?: boolean;
}

export function MessageRenderer({ message, showAgent = true }: MessageRendererProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && showAgent && (
        <div className="flex flex-col gap-2">
          <TextMessage message={message} showAvatar={showAgent} />
          {message.attachment && (
            <div className="ml-10 mt-2">
              {message.attachment.cardType === 'product' && (
                <ProductCard
                  name={message.attachment.name || 'Product'}
                  price={message.attachment.price}
                  imageUrl={message.attachment.imageUrl || ''}
                  category={message.attachment.category}
                />
              )}
              {message.attachment.cardType === 'mockup' && (
                <MockupCard
                  imageUrl={message.attachment.imageUrl || ''}
                  productName={message.attachment.name}
                  variations={message.attachment.variations}
                />
              )}
              {message.attachment.cardType === 'form' && (
                <FormCard
                  question={message.attachment.question || ''}
                  type={message.attachment.formType || 'text'}
                  options={message.attachment.options}
                  currentStep={message.attachment.currentStep}
                  totalSteps={message.attachment.totalSteps}
                  onSubmit={() => {}}
                />
              )}
            </div>
          )}
        </div>
      )}
      {message.role === 'user' && (
        <TextMessage message={message} showAvatar={false} />
      )}
    </div>
  );
}
