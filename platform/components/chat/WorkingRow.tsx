import { Spinner } from '@/components/ui/spinner';

export function WorkingRow({ label }: { label: string }) {
  return (
    <div className="mf-fade-in mf-dimmed flex items-center gap-2 text-[13px]">
      <Spinner className="size-3.5" />
      <span>{label}</span>
    </div>
  );
}
