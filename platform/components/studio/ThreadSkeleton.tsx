/** Quiet placeholder for the content area while a session loads: the shell
 * (sidebar, header) is already on screen, so only this part shimmers. */
export function ThreadSkeleton({ variant = 'thread' }: { variant?: 'thread' | 'home' }) {
  if (variant === 'home') {
    return (
      <div
        aria-busy="true"
        aria-label="Loading"
        className="flex min-h-0 flex-1 flex-col items-start justify-center gap-5 px-6 pb-6 md:items-center md:px-10 md:pb-[60px]"
      >
        <div className="mf-skel h-12 w-[78%] max-w-[520px] md:h-14" />
        <div className="mf-skel h-4 w-[56%] max-w-[360px]" />
        <div className="mf-skel mt-4 h-16 w-full max-w-[760px]" />
      </div>
    );
  }
  return (
    <div aria-busy="true" aria-label="Loading session" className="flex min-h-0 flex-1 flex-col items-center px-5 pt-10 md:px-10">
      <div className="flex w-full max-w-[760px] flex-col gap-8">
        <div className="mf-skel ml-auto h-10 w-[46%]" />
        <div className="flex flex-col gap-2.5">
          <div className="mf-skel h-3.5 w-[82%]" />
          <div className="mf-skel h-3.5 w-[64%]" />
          <div className="mf-skel h-3.5 w-[72%]" />
        </div>
        <div className="mf-skel h-40 w-full max-w-[420px]" />
      </div>
    </div>
  );
}
