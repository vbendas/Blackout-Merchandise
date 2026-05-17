'use client';

import { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { TextMessage } from './messages/TextMessage';
import { ProductCard } from './cards/ProductCard';
import { MockupCard } from './cards/MockupCard';
import { FormCard } from './cards/FormCard';
import { ProductCardMessage } from './ProductCardMessage';
import { ProductDetailModal } from './ProductDetailModal';

interface ProductDetail {
  id: string;
  name: string;
  brand?: string;
  material?: string;
  baseCostEur: number;
  imageUrl?: string;
  description?: string;
  status?: string;
  weightG?: number;
  suggestedRetailEur?: number;
}

interface MessageRendererProps {
  message: ChatMessage;
  showAgent?: boolean;
}

export function MessageRenderer({ message, showAgent = true }: MessageRendererProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProductSelect = (product: ProductDetail) => {
    setSelectedProduct({
      ...product,
      baseCostEur: product.baseCostEur,
    });
    setIsModalOpen(true);
  };

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
          {message.type === 'product-card' && message.metadata?.searchResults && (
            <div className="ml-10 mt-2">
              <ProductCardMessage
                products={message.metadata.searchResults.map((p: Record<string, unknown>) => ({
                  id: p.id as string,
                  name: p.name as string,
                  brand: p.brand as string | undefined,
                  material: p.material as string | undefined,
                  baseCostEur: ((p.price as number) ?? (p.baseCostEur as number) ?? 0) / 100,
                  imageUrl: p.imageUrl as string | undefined,
                  description: p.description as string | undefined,
                  status: p.status as string | undefined,
                  weightG: p.weightG as number | undefined,
                  suggestedRetailEur: p.suggestedRetailEur as number | undefined,
                }))}
                hasMoreResults={message.metadata.hasMoreResults}
                onProductSelect={handleProductSelect}
              />
            </div>
          )}
        </div>
      )}
      {message.role === 'user' && (
        <TextMessage message={message} showAvatar={false} />
      )}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToQuote={(id) => console.log('Add to quote:', id)}
        onStartDesign={(id) => console.log('Start design:', id)}
      />
    </div>
  );
}
