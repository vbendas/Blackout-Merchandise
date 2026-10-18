'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, HelpCircle, Mail, MessageCircle, Phone, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AgentName } from '@/types/expressions';

interface SupportStateProps {
  activeAgent: AgentName;
  onSelectPrompt: (promptText: string) => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I set up my first product?',
    answer:
      'Navigate to the Catalog and select a product you want to customize. Click "Configure" to choose colors, sizes, and add your design. Francisca will guide you through the process.',
    category: 'Getting Started',
  },
  {
    question: 'What are the minimum order quantities?',
    answer:
      'Minimum order quantities vary by product. Most items start at 24 pieces for screen printing and 12 for embroidery. Check the product details for specific MOQs.',
    category: 'Orders',
  },
  {
    question: 'How long does production take?',
    answer:
      'Standard production time is 7-10 business days after artwork approval. Rush orders are available for an additional fee with 3-5 day turnaround.',
    category: 'Production',
  },
  {
    question: 'Can I see samples before ordering?',
    answer:
      'Yes! We offer sample packs and individual sample orders. Contact Antônia through chat or submit a sample request ticket below.',
    category: 'Products',
  },
  {
    question: 'What file formats do you accept for designs?',
    answer:
      'We accept AI, EPS, PDF, PSD, and high-resolution PNG files (300 DPI minimum). Vector files are preferred for best print quality.',
    category: 'Design',
  },
  {
    question: 'How do I track my order?',
    answer:
      "Once your order ships, you'll receive a tracking number via email. You can also check order status in your E-Shop Dashboard or ask Antônia for updates.",
    category: 'Orders',
  },
];

const QUICK_PROMPTS = [
  'I need help with my order',
  'How do I upload my design?',
  'What are your shipping options?',
  'Can I get a quote for bulk pricing?',
];

export function SupportState({ activeAgent: _activeAgent, onSelectPrompt }: SupportStateProps) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate ticket submission
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketSubmitted(false);
      setTicketSubject('');
      setTicketMessage('');
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="fixed top-0 left-16 right-0 z-[60] h-[72px] flex items-center px-3 sm:px-4 md:px-6 lg:px-8 bg-zinc-900/70 backdrop-blur-xl border-b border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <Icon icon="solar:headphones-round-linear" className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Support Center</h2>
            <p className="text-xs text-zinc-400">Get help from Antônia and our team</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-[72px] flex-1 overflow-y-auto py-6 space-y-8">
        {/* Quick Help Section */}
        <section>
          <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Quick Help
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((prompt, index) => (
              <motion.button
                key={index}
                onClick={() => onSelectPrompt(prompt)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="text-left px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 transition-all"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, index) => (
              <div key={index} className="border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/30 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <span className="text-sm text-zinc-200">{faq.question}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 py-3 bg-zinc-900/20 border-t border-zinc-800"
                  >
                    <p className="text-sm text-zinc-400 leading-relaxed">{faq.answer}</p>
                    <span className="inline-block mt-2 text-xs text-zinc-600 px-2 py-1 bg-zinc-800/50 rounded">
                      {faq.category}
                    </span>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact Options */}
        <section>
          <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Us
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Live Chat</p>
                <p className="text-xs text-zinc-500">Available 9am-6pm EST</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Email</p>
                <p className="text-xs text-zinc-500">support@blackoutmerch.example</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Phone</p>
                <p className="text-xs text-zinc-500">1-800-BLACKOUT</p>
              </div>
            </div>
          </div>
        </section>

        {/* Submit Ticket Form */}
        <section>
          <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Submit a Ticket
          </h3>
          {ticketSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Icon icon="lucide:check" className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-emerald-400 font-medium">Ticket Submitted!</p>
              <p className="text-sm text-emerald-400/70 mt-1">We&apos;ll get back to you within 24 hours.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label htmlFor="ticket-subject" className="block text-sm text-zinc-400 mb-1.5">
                  Subject
                </label>
                <Input
                  id="ticket-subject"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="What do you need help with?"
                  className="bg-zinc-900/50 border-zinc-800 focus:border-zinc-600"
                  required
                />
              </div>
              <div>
                <label htmlFor="ticket-message" className="block text-sm text-zinc-400 mb-1.5">
                  Message
                </label>
                <Textarea
                  id="ticket-message"
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="bg-zinc-900/50 border-zinc-800 focus:border-zinc-600 min-h-[120px]"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200">
                <Ticket className="w-4 h-4 mr-2" />
                Submit Ticket
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
