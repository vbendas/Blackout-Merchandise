import { DEV_BYPASS, requireRegistered } from '@/lib/auth';
import { linkStatus } from '@/lib/services/discord';
import { PageTopBar } from '@/components/studio/PageTopBar';
import { SettingsForm } from '@/components/studio/settings/SettingsForm';
import { LOCALE_CODES } from '@/components/studio/settings/locales';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { user, store } = await requireRegistered();
  const discord = await linkStatus(user.id);
  const locale = user.locale && LOCALE_CODES.includes(user.locale) ? user.locale : 'en';

  return (
    <>
      <PageTopBar title="Settings" />
      <main className="w-full max-w-[720px] px-5 pt-2 pb-20 md:px-8">
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
    </>
  );
}
