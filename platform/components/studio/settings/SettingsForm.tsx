'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsSection } from './SettingsSection';
import { SUPPORTED_LOCALES } from './locales';
import { ManageAccountButton } from './ManageAccountButton';
import { initials as initialsFor } from '@/components/studio/AccountMenu';
import { ExternalArrow } from '@/components/studio/ExternalArrow';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import { shopUrl, shopUrlLabel } from '@/lib/format/shop-url';
import { setPressBoardAction } from '@/app/(chat)/studio/settings/actions';
import '@/components/studio/studio.css';

interface Props {
  displayName: string;
  email: string;
  imageUrl: string | null;
  locale: string;
  discord: { linked: boolean; username: string | null; discordDm: boolean; email: boolean };
  shop: { name: string; slug: string; showOnPressBoard: boolean } | null;
  clerkAvailable: boolean;
}

type NoteKey = 'name' | 'language' | 'discordDm' | 'email' | 'pressBoard';
interface Note {
  tone: 'ok' | 'error';
  text: string;
}

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

/** Save feedback, one slot per control, so the answer shows next to what was
 * changed. "Saved" fades after a few seconds; an error stays until the next try. */
function useNotes() {
  const [notes, setNotes] = useState<Partial<Record<NoteKey, Note>>>({});
  const timers = useRef<Partial<Record<NoteKey, number>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) window.clearTimeout(timer);
    };
  }, []);

  const show = useCallback((key: NoteKey, note: Note | null) => {
    window.clearTimeout(timers.current[key]);
    setNotes((prev) => ({ ...prev, [key]: note ?? undefined }));
    if (note?.tone === 'ok') {
      timers.current[key] = window.setTimeout(() => setNotes((prev) => ({ ...prev, [key]: undefined })), 4000);
    }
  }, []);

  return [notes, show] as const;
}

/** The answer to a save, beside the control. Always in the page (empty until
 * there is something to say) so screen readers announce it when it fills. */
function SaveNote({ note }: { note?: Note }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="text-[13px] leading-[18px]"
      style={{ color: note?.tone === 'error' ? 'var(--danger)' : 'color-mix(in srgb, var(--signal) 80%, transparent)' }}
    >
      {note?.text}
    </span>
  );
}

function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  note,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  note?: Note;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className={`block text-[14px] ${disabled ? '' : 'cursor-pointer'}`}>
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="mf-dimmed m-0 text-[13px] leading-[18px]">
            {hint}
          </p>
        ) : null}
      </div>
      <SaveNote note={note} />
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="mf-switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

export function SettingsForm({ displayName, email, imageUrl, locale, discord, shop, clerkAvailable }: Props) {
  const router = useRouter();
  const { askStudio } = useStudioSidebar();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(displayName);
  const [savedName, setSavedName] = useState(displayName);
  const [lang, setLang] = useState(locale);
  const [prefs, setPrefsState] = useState({ discordDm: discord.discordDm, email: discord.email });
  const [pressBoard, setPressBoard] = useState(shop?.showOnPressBoard ?? false);
  const [notes, showNote] = useNotes();
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 1 && trimmed.length <= 60;
  const nameDirty = trimmed !== savedName;

  async function save(key: NoteKey, body: Record<string, unknown>, okText: string): Promise<boolean> {
    setBusy(true);
    showNote(key, null);
    const err = await patch(body);
    setBusy(false);
    if (err) {
      showNote(key, { tone: 'error', text: err });
      return false;
    }
    showNote(key, { tone: 'ok', text: okText });
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
            if (await save('name', { displayName: trimmed }, 'Name saved.')) setSavedName(trimmed);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input id="display-name" className="mf-field min-w-[220px] flex-[1_1_220px]" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button type="submit" className="mf-pill mf-pill-primary" disabled={busy || !nameValid || !nameDirty}>
            Save name
          </button>
          <SaveNote note={notes.name} />
        </form>
        {clerkAvailable ? (
          <div style={{ marginTop: 16 }}>
            <ManageAccountButton />
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection label="Language">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Language"
            className="mf-field mf-select w-full max-w-[280px]"
            value={lang}
            disabled={busy}
            onChange={async (e) => {
              const next = e.target.value;
              const prev = lang;
              setLang(next);
              if (!(await save('language', { locale: next }, 'Language saved.'))) setLang(prev);
            }}
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <SaveNote note={notes.language} />
        </div>
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
          id="notify-discord"
          label="Discord messages"
          hint={
            discord.linked
              ? 'Proofs, sales and shipping updates sent to you on Discord.'
              : 'Proofs, sales and shipping updates on Discord. Connect Discord above to turn this on.'
          }
          checked={prefs.discordDm}
          disabled={!discord.linked || busy}
          note={notes.discordDm}
          onChange={async (v) => {
            const prev = prefs;
            setPrefsState({ ...prefs, discordDm: v });
            if (!(await save('discordDm', { discordDm: v }, 'Saved.'))) setPrefsState(prev);
          }}
        />
        <Toggle
          id="notify-email"
          label="Email"
          hint="The same updates in your inbox."
          checked={prefs.email}
          disabled={busy}
          note={notes.email}
          onChange={async (v) => {
            const prev = prefs;
            setPrefsState({ ...prefs, email: v });
            if (!(await save('email', { email: v }, 'Saved.'))) setPrefsState(prev);
          }}
        />
      </SettingsSection>

      {shop ? (
        <SettingsSection label="Shop">
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(80px, 120px) 1fr', gap: '10px 16px', fontSize: 14 }}>
            <dt className="mf-dimmed">Name</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{shop.name}</dd>
            <dt className="mf-dimmed">Address</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>
              {shopUrlLabel(shop.slug)}
              <a
                href={shopUrl(shop.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="mf-ulink ml-3 inline-flex items-center gap-1"
              >
                View shop
                <ExternalArrow />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </dd>
          </dl>
          <div style={{ marginTop: 18 }}>
            <button type="button" className="mf-pill" onClick={() => askStudio('I want to change my shop name or address')}>
              Change name or address
            </button>
          </div>
          <div style={{ marginTop: 18 }}>
            <Toggle
              id="press-board"
              label="Show my shop's name on the MerchFrom press board"
              hint="The live board on merchfrom.com shows what is being printed: the garment, how many, the ink and the stage. When on, it names your shop beside your runs and shop orders. When off, they read Private."
              checked={pressBoard}
              disabled={busy}
              note={notes.pressBoard}
              onChange={async (v) => {
                const prev = pressBoard;
                setPressBoard(v);
                setBusy(true);
                showNote('pressBoard', null);
                const result = await setPressBoardAction(v).catch(() => ({ ok: false as const, error: 'That did not save. Check your connection and try again.' }));
                setBusy(false);
                if (!result.ok) {
                  setPressBoard(prev);
                  showNote('pressBoard', { tone: 'error', text: result.error });
                  return;
                }
                showNote('pressBoard', { tone: 'ok', text: 'Saved.' });
                startTransition(() => router.refresh());
              }}
            />
          </div>
        </SettingsSection>
      ) : null}
    </div>
  );
}
