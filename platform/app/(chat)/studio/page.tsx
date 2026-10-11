import { StudioHome } from '@/components/studio/StudioHome';

/** /studio: always a fresh session on the home screen (greeting, quick
 * actions, composer). The shell and auth live in ./layout.tsx. */
export default function StudioPage() {
  return <StudioHome />;
}
