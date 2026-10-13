/** Quiet placeholder for the content area while a session loads: the shell
 * (sidebar, header) is already on screen, so only this part shimmers. The
 * home variant follows the home's column: headline, line, composer. */
export function ThreadSkeleton({ variant = 'thread' }: { variant?: 'thread' | 'home' }) {
  if (variant === 'home') {
    return (
      <div aria-busy="true" aria-label="Loading" className="flex min-h-0 flex-1 flex-col items-center px-4 pt-10 md:justify-center md:px-10 md:pt-0 md:pb-16">
        <div className="flex w-full max-w-[720px] flex-col gap-3">
          <div className="mf-skel h-10 w-[78%] md:h-14 md:w-[74%]" />
          <div className="mf-skel h-4 w-[56%] md:h-5" />
          <div className="mf-skel mt-6 h-14 w-full md:mt-6 md:h-16" />
        </div>
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
