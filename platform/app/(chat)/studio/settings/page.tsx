import { DEV_BYPASS, requireRegistered } from '@/lib/auth';
import { linkStatus } from '@/lib/services/discord';
import { SettingsForm } from '@/components/studio/settings/SettingsForm';
import { LOCALE_CODES } from '@/components/studio/settings/locales';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { user, store } = await requireRegistered();
  const discord = await linkStatus(user.id);
  const locale = user.locale && LOCALE_CODES.includes(user.locale) ? user.locale : 'en';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px', width: '100%' }}>
      <h1 className="mf-display" style={{ fontSize: 'clamp(30px, 5vw, 44px)', lineHeight: 1.05, margin: '0 0 32px' }}>
        Settings
      </h1>
      <SettingsForm
        displayName={user.displayName ?? ''}
        email={user.email}
        imageUrl={user.imageUrl}
        locale={locale}
        discord={{ linked: discord.linked, username: discord.username, discordDm: discord.discordDm, email: discord.email }}
        shop={store ? { name: store.name, slug: store.slug } : null}
        clerkAvailable={!DEV_BYPASS}
      />
    </main>
  );
}
