'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';

// Button primitive (Round 9 WP6a). Look lives in design-tokens/components.css
// (.mf-btn); this file only picks the element and wires state.
//
//   variant  primary   brand fill, ONE per viewport (script-checked)
//            ink       --fg fill
//            secondary --rule outline
//            link      text with a drawn underline
//   size     40 | 48 | 56 | 64 (px)
//   href     renders next/link (internal) or a plain <a> (http, mailto, tel
//            or target=_blank). Without href it is a <button>.
//   loading  inert but keeps focus (aria-busy + aria-disabled); a blinking
//            block shows in front of the label
//   disabled native disabled for buttons; for links the href is dropped and
//            aria-disabled set (an <a> cannot be natively disabled)

export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'link';
export type ButtonSize = 40 | 48 | 56 | 64;

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fill the container width. */
  block?: boolean;
  loading?: boolean;
  /** Decorative node before / after the label (inline SVG; aria-hidden). */
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  className?: string;
  children?: ReactNode;
}

type NativeButtonProps = Omit<ComponentProps<'button'>, keyof ButtonOwnProps>;
type LinkProps = Omit<ComponentProps<typeof Link>, keyof ButtonOwnProps | 'href'>;

export type ButtonProps =
  | (ButtonOwnProps & NativeButtonProps & { href?: undefined })
  | (ButtonOwnProps &
      LinkProps & {
        href: ComponentProps<typeof Link>['href'];
        /** Treated as a disabled link: no href, aria-disabled. */
        disabled?: boolean;
      });

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function isExternal(href: ComponentProps<typeof Link>['href'], target?: string) {
  if (target === '_blank') return true;
  return typeof href === 'string' && EXTERNAL.test(href);
}

export function Button(props: ButtonProps) {
  const {
    variant = 'secondary',
    size = 48,
    block,
    loading,
    iconStart,
    iconEnd,
    className,
    children,
    ...rest
  } = props;

  const classes = ['mf-btn', className].filter(Boolean).join(' ');
  const common = {
    className: classes,
    'data-variant': variant,
    'data-size': size,
    'data-block': block ? '' : undefined,
    'data-brand-fill': variant === 'primary' ? '' : undefined,
    'data-loading': loading ? '' : undefined,
    'aria-busy': loading ? true : undefined,
  };

  const content = (
    <>
      <span className="mf-btn__spin" aria-hidden="true" />
      {iconStart ? (
        <span className="mf-btn__icon" aria-hidden="true">
          {iconStart}
        </span>
      ) : null}
      {children}
      {iconEnd ? (
        <span className="mf-btn__icon" aria-hidden="true">
          {iconEnd}
        </span>
      ) : null}
    </>
  );

  if ('href' in rest && rest.href !== undefined) {
    const { href, disabled, onClick, target, rel, ...anchor } = rest as LinkProps & {
      href: ComponentProps<typeof Link>['href'];
      disabled?: boolean;
      onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
    };
    const inert = Boolean(disabled || loading);

    if (disabled) {
      // No href: an <a> without one is not a link, so it is not focusable or
      // activatable; role + aria-disabled keep it announced.
      return (
        <a {...common} role="link" aria-disabled="true">
          {content}
        </a>
      );
    }

    const handle = (e: MouseEvent<HTMLAnchorElement>) => {
      if (inert) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    if (isExternal(href, target)) {
      const url = typeof href === 'string' ? href : (href.href ?? '');
      return (
        <a
          {...(anchor as ComponentProps<'a'>)}
          {...common}
          href={url}
          target={target}
          rel={target === '_blank' ? (rel ?? 'noopener noreferrer') : rel}
          aria-disabled={loading ? true : undefined}
          onClick={handle}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        {...anchor}
        {...common}
        href={href}
        target={target}
        rel={rel}
        aria-disabled={loading ? true : undefined}
        onClick={handle}
      >
        {content}
      </Link>
    );
  }

  const { type = 'button', disabled, onClick, ...button } = rest as NativeButtonProps;
  return (
    <button
      {...button}
      {...common}
      type={type}
      disabled={disabled}
      aria-disabled={loading ? true : undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {content}
    </button>
  );
}
