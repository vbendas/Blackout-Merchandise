import { ChecklistList } from '@/components/cards/ChecklistList';
import type { OnboardingProjectState } from '@/components/cards/project/types';

export function OnboardingProjectView({ state, onPrompt }: { state: OnboardingProjectState; onPrompt: (text: string) => void }) {
  const items = state.items ?? [];
  if (items.length === 0) {
    return <p className="mfc-empty">Nothing to set up yet.</p>;
  }
  return <ChecklistList items={items} onPrompt={onPrompt} />;
}
