'use client';

import { useState } from 'react';

/** An invite link the owner can copy and send by hand. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="tm-link-box">{url}</p>
      <div className="tm-actions">
        <button
          type="button"
          className="tm-btn"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(url)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
