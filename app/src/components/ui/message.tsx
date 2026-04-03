'use client';

import * as Avatar from '@radix-ui/react-avatar';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: 'user' | 'assistant';
};

export const Message = ({ children, className, from, ...props }: MessageProps) => (
  <div className={cn('flex w-full gap-2', from === 'user' ? 'flex-row-reverse' : 'flex-row', className)} {...props}>
    {children}
  </div>
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'contained' | 'flat';
};

const getMessageContentStyles = (variant: 'contained' | 'flat', from: 'user' | 'assistant') => {
  if (variant === 'contained' && from === 'user') {
    return 'bg-primary text-primary-foreground';
  }
  if (variant === 'contained' && from === 'assistant') {
    return 'bg-muted text-foreground';
  }
  if (variant === 'flat' && from === 'assistant') {
    return 'bg-transparent';
  }
  return '';
};

export const MessageContent = ({
  children,
  className,
  variant = 'contained',
  from = 'assistant',
  ...props
}: MessageContentProps & { from?: 'user' | 'assistant' }) => (
  <div
    className={cn('relative max-w-[85%] rounded-2xl px-4 py-2.5', getMessageContentStyles(variant, from), className)}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = HTMLAttributes<HTMLSpanElement> & {
  src?: string;
  name?: string;
};

export const MessageAvatar = ({ className, src, name, ...props }: MessageAvatarProps) => {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <Avatar.Root className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)} {...props}>
      <Avatar.Image className="aspect-square h-full w-full object-cover" src={src} alt={name} />
      <Avatar.Fallback
        className="flex h-full w-full items-center justify-center bg-muted text-sm font-medium"
        delayMs={600}
      >
        {initials}
      </Avatar.Fallback>
    </Avatar.Root>
  );
};
