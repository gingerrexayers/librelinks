import { notFound, permanentRedirect } from 'next/navigation';
import { ProfilePage, profileMetadata } from '@/lib/profile-page';

export const revalidate = 60;

// Generate profiles on demand, then cache their HTML and RSC responses.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  return profileMetadata(handle.trim().toLowerCase());
}

export default async function Page({ params }) {
  const { handle } = await params;
  const canonicalHandle = handle.trim().toLowerCase();
  if (!canonicalHandle) notFound();
  if (handle !== canonicalHandle) {
    permanentRedirect(`/${canonicalHandle}`);
  }
  return <ProfilePage handle={canonicalHandle} />;
}
