'use client';

import { useUser } from '@clerk/nextjs';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAvatarExpression } from '@/lib/AvatarExpressionContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StoreStats {
  totalRevenue: number;
  weeklyRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
}

interface AIAssistantSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const quickPrompts = [
  "What's my revenue this week?",
  'Show me orders in production',
  'How do I add a new product?',
  'When is my next payout?',
];

export function AIAssistantSidebar({ isOpen, onToggle }: AIAssistantSidebarProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hey there! I'm Leopoldo, your store assistant. I can help you track orders, check your revenue, or manage your products. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [storeStats, setStoreStats] = useState<StoreStats>({
    totalRevenue: 0,
    weeklyRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { setExpression } = useAvatarExpression();

  // Auto-scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  // Fetch store stats when sidebar opens
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const fetchStoreStats = async () => {
      setIsLoadingStats(true);
      try {
        const response = await fetch(`/api/orders?userId=${user.id}`);
        const data = await response.json();

        if (data.orders && Array.isArray(data.orders)) {
          const orders = data.orders;
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const totalRevenue =
            orders.reduce((sum: number, o: { totalAmount: number }) => sum + (o.totalAmount || 0), 0) / 100;
          const weeklyRevenue =
            orders
              .filter((o: { createdAt: string | Date }) => new Date(o.createdAt) >= weekAgo)
              .reduce((sum: number, o: { totalAmount: number }) => sum + (o.totalAmount || 0), 0) / 100;

          const stats: StoreStats = {
            totalRevenue,
            weeklyRevenue,
            totalOrders: orders.length,
            pendingOrders: orders.filter((o: { status: string }) => o.status === 'pending').length,
            processingOrders: orders.filter((o: { status: string }) => o.status === 'processing' || o.status === 'paid')
              .length,
            shippedOrders: orders.filter((o: { status: string }) => o.status === 'shipped' || o.status === 'fulfilled')
              .length,
          };

          setStoreStats(stats);
        }
      } catch (error) {
        console.error('Failed to fetch store stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStoreStats();
  }, [isOpen, user?.id]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setExpression('thinking');

    // Generate response using real data
    setTimeout(() => {
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(amount);
      };

      const responses: Record<string, string> = {
        revenue: isLoadingStats
          ? 'Let me pull up your revenue data...'
          : storeStats.totalOrders === 0
            ? "You haven't made any sales yet! Once you get your first orders, I'll be able to show you your revenue stats here."
            : `Your total revenue is ${formatCurrency(storeStats.totalRevenue)}. This week you made ${formatCurrency(storeStats.weeklyRevenue)}! 🎉`,
        orders:
          storeStats.totalOrders === 0
            ? "You don't have any orders yet. Once customers start purchasing, I'll show you the details here!"
            : `You currently have ${storeStats.totalOrders} orders. ${storeStats.processingOrders} are in production, ${storeStats.shippedOrders} have shipped.`,
        payout:
          storeStats.totalOrders === 0
            ? "You don't have any payouts yet. Once you start making sales, your payouts will be tracked here!"
            : `Your next payout of ${formatCurrency(storeStats.totalRevenue * 0.6)} is based on your current sales. Your profit margin is looking great at 60%!`,
        product:
          'To add a new product, go to the Products tab and click "Add Product". I can help you choose the right blank and pricing!',
        default:
          "I'll help you with that! Let me pull up that information for you. In the meantime, you can check the relevant tab in your dashboard for more details.",
      };

      const lowerInput = inputValue.toLowerCase();
      let responseText = responses.default;

      if (
        lowerInput.includes('revenue') ||
        lowerInput.includes('money') ||
        lowerInput.includes('sales') ||
        lowerInput.includes('earnings')
      ) {
        responseText = responses.revenue;
        setExpression('happy');
      } else if (lowerInput.includes('order') || lowerInput.includes('production') || lowerInput.includes('shipping')) {
        responseText = responses.orders;
        setExpression('neutral');
      } else if (lowerInput.includes('payout') || lowerInput.includes('payment') || lowerInput.includes('profit')) {
        responseText = responses.payout;
        setExpression('happy');
      } else if (lowerInput.includes('product') || lowerInput.includes('add') || lowerInput.includes('create')) {
        responseText = responses.product;
        setExpression('excited');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onToggle}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 bg-zinc-900 border border-zinc-700 rounded-full p-3 shadow-lg hover:bg-zinc-800 transition-colors"
        title="Open AI Assistant"
      >
        <Icon icon="lucide:message-circle" className="w-5 h-5 text-zinc-300" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="border-l border-zinc-800 bg-zinc-900/50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <Icon icon="lucide:bot" className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-white">Leopoldo</h3>
            <p className="text-xs text-zinc-500">Store Assistant</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Close sidebar"
        >
          <Icon icon="lucide:panel-right-close" className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === 'user' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl px-3 py-2 flex items-center gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full"
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-2">Quick questions:</p>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handlePromptClick(prompt)}
              className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            placeholder="Ask Leopoldo..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-zinc-800 border-zinc-700 text-sm"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="shrink-0"
          >
            <Icon icon="lucide:send" className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
