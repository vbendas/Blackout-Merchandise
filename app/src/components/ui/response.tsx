'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';

export type ResponseProps = {
  children?: React.ReactNode;
  className?: string;
};

type Token = string;

interface ResponseComponentProps {
  tokens?: Token[];
  className?: string;
}

const formatContent = (content: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];

  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, component: (match: string) => <strong key={match}>{match}</strong> },
    {
      regex: /\[(.+?)\]\((.+?)\)/g,
      component: (match: string, text: string, url: string) => (
        <a
          key={match}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {text}
        </a>
      ),
    },
    { regex: /\n\n/g, component: () => <br key={Math.random()} /> },
    {
      regex: /^\d+\.\s/g,
      component: (match: string) => (
        <span key={match} className="hidden">
          {match}
        </span>
      ),
    },
  ];

  let remaining = content;
  let key = 0;

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number } | null = null;
    let matchedPattern: (typeof patterns)[0] | null = null;
    let matchResult: RegExpMatchArray | null = null;

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      const match = regex.exec(remaining);
      if (match && (!earliestMatch || match.index < earliestMatch.index)) {
        earliestMatch = { index: match.index, length: match[0].length };
        matchedPattern = pattern;
        matchResult = match;
      }
    }

    if (earliestMatch && matchedPattern && matchResult) {
      if (earliestMatch.index > 0) {
        elements.push(<span key={key++}>{remaining.slice(0, earliestMatch.index)}</span>);
      }

      if (matchedPattern.regex.source.includes('**')) {
        const boldContent = matchResult[1];
        elements.push(<strong key={key++}>{boldContent}</strong>);
      } else if (matchedPattern.regex.source.includes('\\[')) {
        elements.push(
          <a
            key={key++}
            href={matchResult[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {matchResult[1]}
          </a>
        );
      } else if (matchedPattern.regex.source.includes('\\n\\n')) {
        elements.push(<br key={key++} />);
      } else if (matchedPattern.regex.source.includes('\\d+\\.\\s')) {
        elements.push(
          <span key={key++} className="list-item">
            {matchResult[0]}
          </span>
        );
      }

      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      if (remaining.length > 0) {
        elements.push(<span key={key++}>{remaining}</span>);
      }
      break;
    }
  }

  return elements;
};

export const Response = ({ children, className }: ResponseProps) => {
  if (typeof children === 'string') {
    return <div className={cn('whitespace-pre-wrap', className)}>{formatContent(children)}</div>;
  }

  return <div className={className}>{children}</div>;
};

export const StreamingResponse = ({ tokens = [], className }: ResponseComponentProps) => {
  const content = useMemo(() => {
    return tokens.join('');
  }, [tokens]);

  const formattedContent = useMemo(() => {
    return formatContent(content);
  }, [content]);

  return (
    <div className={cn('whitespace-pre-wrap', className)}>
      {formattedContent}
      <span className="animate-pulse inline-block h-4 w-0.5 align-middle ml-0.5 bg-foreground" />
    </div>
  );
};
