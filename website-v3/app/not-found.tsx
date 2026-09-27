import { NotFoundCopy } from './NotFoundCopy';

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col justify-center"
      style={{
        paddingLeft: 'var(--gutter)',
        paddingRight: 'var(--gutter)',
        paddingTop: 'calc(var(--header-h) + 24px)',
        paddingBottom: '96px',
      }}
    >
      <NotFoundCopy />
    </main>
  );
}
