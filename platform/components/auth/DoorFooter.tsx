import { CONTACT_EMAIL, siteHref } from '@/components/auth/door-links';

/** The website door's contact row. door.css shows one copy: inside the first
 * screen on desktop and tablet ('door-foot-in'), below the fold on phones
 * ('door-foot-out'), so the statement keeps the centre there. */
export function DoorFooter({ className }: { className: string }) {
  return (
    <footer className={`door-foot ${className}`} aria-label="Contact">
      <span className="door-fi is-ask">
        <a className="door-flink" href={siteHref('/#ask')}>
          Ask
        </a>
      </span>
      <span className="door-fi is-faq">
        <a className="door-flink" href={siteHref('/faq/')}>
          FAQ
        </a>
      </span>
      <span className="door-fi is-write">
        <span className="door-label">Write</span>
        <a className="door-flink door-lc" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </span>
      <span className="door-fi is-agents">
        <a className="door-flink" href={siteHref('/agents/')}>
          For agents
        </a>
      </span>
      <span className="door-fi is-place door-label">Barcelona, ES</span>
    </footer>
  );
}
