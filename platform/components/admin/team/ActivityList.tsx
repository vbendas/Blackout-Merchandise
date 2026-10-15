import Link from 'next/link';
import type { ActivityEntryView } from '@/lib/services/team';
import { activityAreaLabel, formatWhen } from '@/components/admin/team/format';

function itemHref(entry: ActivityEntryView): string | null {
  if (!entry.itemType || !entry.itemId || entry.itemType === 'page') return null;
  if (entry.itemType === 'user') return `/admin/team/${entry.itemId}`;
  return `/admin/team/activity?itemType=${encodeURIComponent(entry.itemType)}&itemId=${encodeURIComponent(entry.itemId)}`;
}

/** The activity log as a list: when, who, what, and where it happened (an
 * area, or the assistant). `showActor`: false on a person's own page. */
export function ActivityList({ entries, showActor = true, areaLabels }: { entries: ActivityEntryView[]; showActor?: boolean; areaLabels?: Map<string, string> }) {
  if (entries.length === 0) return <p className="tm-dim">Nothing yet.</p>;
  return (
    <ol className="tm-log">
      {entries.map((entry) => {
        const href = itemHref(entry);
        const where =
          entry.source === 'assistant'
            ? (entry.toolName && areaLabels?.get(entry.toolName)) || 'Assistant'
            : activityAreaLabel(entry.area);
        return (
          <li key={`${entry.source}-${entry.id}`}>
            <span className="tm-mono tm-dim text-[12px]">{formatWhen(entry.at)}</span>
            <span>
              {showActor ? (
                <Link href={`/admin/team/${entry.actorId}`} className="font-medium underline-offset-4 hover:underline">
                  {entry.actorName}
                </Link>
              ) : null}
              {showActor ? ' · ' : null}
              {href ? (
                <Link href={href} className="underline-offset-4 hover:underline">
                  {entry.summary}
                </Link>
              ) : (
                entry.summary
              )}
            </span>
            <span className="tm-tag">{entry.source === 'assistant' ? `Assistant · ${where}` : where}</span>
          </li>
        );
      })}
    </ol>
  );
}
