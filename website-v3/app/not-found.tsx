import { PageCorners } from '@/components/PageCorners';
import { NotFoundCopy } from './NotFoundCopy';

export default function NotFound() {
  return (
    <>
      <PageCorners />
      <main
        className="flex min-h-screen flex-col justify-center"
        style={{
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          paddingTop: '96px',
          paddingBottom: '96px',
        }}
      >
        <NotFoundCopy />
      </main>
    </>
  );
}
