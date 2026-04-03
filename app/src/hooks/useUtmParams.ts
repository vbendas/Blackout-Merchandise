import { useEffect, useState } from 'react';

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  ref?: string;
}

export function useUtmParams(): UtmParams {
  const [utmParams, setUtmParams] = useState<UtmParams>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    const captured: UtmParams = {
      source: params.get('utm_source') ?? params.get('ref') ?? undefined,
      medium: params.get('utm_medium') ?? undefined,
      campaign: params.get('utm_campaign') ?? undefined,
      content: params.get('utm_content') ?? undefined,
      term: params.get('utm_term') ?? undefined,
      ref: params.get('ref') ?? undefined,
    };

    const source = captured.source ?? 'direct';

    setUtmParams({ ...captured, source });

    const stored = localStorage.getItem('merchfrom_utm');
    let storedParams: UtmParams = {};
    try {
      storedParams = stored ? JSON.parse(stored) : {};
    } catch {
      storedParams = {};
    }

    if (!storedParams.source && source !== 'direct') {
      localStorage.setItem('merchfrom_utm', JSON.stringify(captured));
    } else if (storedParams.source && !captured.source) {
      setUtmParams(storedParams);
    }
  }, []);

  return utmParams;
}

export function getUtmSource(): string {
  if (typeof window === 'undefined') return 'direct';

  const params = new URLSearchParams(window.location.search);
  return params.get('utm_source') ?? params.get('ref') ?? localStorage.getItem('merchfrom_utm_source') ?? 'direct';
}
