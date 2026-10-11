'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsSection } from './SettingsSection';
import { SUPPORTED_LOCALES } from './locales';
import { ManageAccountButton } from './ManageAccountButton';
import { initials as initialsFor } from '@/components/studio/AccountMenu';

interface Props {
  displayName: string;
  email: string;
  imageUrl: string | null;
  locale: string;
  discord: { linked: boolean; username: string | null; discordDm: boolean; email: boolean };
  shop: { name: string; slug: string } | null;
  clerkAvailable: boolean;
}

const input: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  borderRadius: 2,
  border: 'var(--hairline)',
  background: 'transparent',
  color: 'var(--signal)',
  font: 'inherit',
  fontSize: 14,
  minWidth: 0,
};

async function patch(body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch('/api/studio/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return null;
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? 'That did not save. Please try again.';
  } catch {
    return 'That did not save. Check your connection and try again.';
  }
}

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      <span>
        <span style={{ display: 'block', fontSize: 14 }}>{label}</span>
        {hint ? <span className="mf-dimmed" style={{ display: 'block', fontSize: 13 }}>{hint}</span> : null}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#fff', flex: 'none' }} />
    </label>
  );
}

export function SettingsForm({ displayName, email, imageUrl, locale, discord, shop, clerkAvailable }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(displayName);
  const [savedName, setSavedName] = useState(displayName);
  const [lang, setLang] = useState(locale);
  const [prefs, setPrefsState] = useState({ discordDm: discord.discordDm, email: discord.email });
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 1 && trimmed.length <= 60;
  const nameDirty = trimmed !== savedName;

  async function save(body: Record<string, unknown>, okText: string): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    const err = await patch(body);
    setBusy(false);
    if (err) {
      setMessage({ tone: 'error', text: err });
      return false;
    }
    setMessage({ tone: 'ok', text: okText });
    startTransition(() => router.refresh());
    return true;
  }

  const initials = initialsFor(savedName || email);

  return (
    <div>
      <SettingsSection label="Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: 2, objectFit: 'cover' }} />
          ) : (
            <div className="mf-hairline mf-label" style={{ width: 56, height: 56, borderRadius: 2, display: 'grid', placeItems: 'center' }}>
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15 }}>{savedName || 'Your name'}</div>
            <div className="mf-dimmed" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{email}</div>
          </div>
        </div>
        <label className="mf-label mf-dimmed" htmlFor="display-name" style={{ display: 'block', marginBottom: 8 }}>
          Display name
        </label>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!nameValid || !nameDirty) return;
            if (await save({ displayName: trimmed }, 'Name saved.')) setSavedName(trimmed);
          }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <input id="display-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={{ ...input, flex: '1 1 220px' }} />
          <button type="submit" className="mf-pill mf-pill-primary" disabled={busy || !nameValid || !nameDirty}>
            Save name
          </button>
        </form>
        {clerkAvailable ? (
          <div style={{ marginTop: 16 }}>
            <ManageAccountButton />
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection label="Language">
        <select
          aria-label="Language"
          value={lang}
          disabled={busy}
          onChange={async (e) => {
            const next = e.target.value;
            const prev = lang;
            setLang(next);
            if (!(await save({ locale: next }, 'Language saved.'))) setLang(prev);
          }}
          style={{ ...input, width: '100%', maxWidth: 280, colorScheme: 'dark' }}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <p className="mf-dimmed" style={{ fontSize: 13, margin: '10px 0 0' }}>The Studio assistant and your emails will use this language.</p>
      </SettingsSection>

      <SettingsSection label="Notifications">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ fontSize: 14 }}>
            {discord.linked ? (
              <>Discord connected{discord.username ? <span className="mf-dimmed"> as {discord.username}</span> : null}</>
            ) : (
              <span className="mf-dimmed">Discord is not connected</span>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth redirect route, needs a full navigation */}
          <a className="mf-ulink" href="/api/discord/link">
            {discord.linked ? 'Reconnect Discord' : 'Connect Discord'}
          </a>
        </div>
        <Toggle
          label="Discord messages"
          hint="Proofs, sales and shipping updates sent to you on Discord."
          checked={prefs.discordDm}
          disabled={!discord.linked || busy}
          onChange={async (v) => {
            const prev = prefs;
            setPrefsState({ ...prefs, discordDm: v });
            if (!(await save({ discordDm: v }, 'Notification settings saved.'))) setPrefsState(prev);
          }}
        />
        <Toggle
          label="Email"
          hint="The same updates in your inbox."
          checked={prefs.email}
          disabled={busy}
          onChange={async (v) => {
            const prev = prefs;
            setPrefsState({ ...prefs, email: v });
            if (!(await save({ email: v }, 'Notification settings saved.'))) setPrefsState(prev);
          }}
        />
      </SettingsSection>

      {shop ? (
        <SettingsSection label="Shop">
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(80px, 120px) 1fr', gap: '10px 16px', fontSize: 14 }}>
            <dt className="mf-dimmed">Name</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{shop.name}</dd>
            <dt className="mf-dimmed">Address</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{shop.slug}</dd>
          </dl>
          <p className="mf-dimmed" style={{ fontSize: 13, margin: '14px 0 0' }}>Change these by asking in the Studio.</p>
        </SettingsSection>
      ) : null}

      <div role="status" aria-live="polite" style={{ minHeight: 24, fontSize: 13, color: message?.tone === 'error' ? 'var(--danger)' : 'var(--success)' }}>
        {message?.text}
      </div>
    </div>
  );
}
