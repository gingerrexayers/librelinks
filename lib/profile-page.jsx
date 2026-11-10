import { notFound } from 'next/navigation';
import { loadPublicProfile } from '@/lib/public-profile';
import { siteConfig } from '@/config/site';
import Profile from '@/views/profile';

export async function profileMetadata(handle) {
  const user = await loadPublicProfile(handle);
  if (!user) return { title: 'Page Not Found' };
  const title = user.name || user.handle;
  const description = user.bio || `${title}'s page.`;
  const url =
    handle === siteConfig.rootHandle
      ? siteConfig.url
      : `${siteConfig.url}/${handle}`;
  const image = user.image || siteConfig.ogImage;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      title,
      description,
      url,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export async function ProfilePage({ handle }) {
  const profile = await loadPublicProfile(handle);
  if (!profile?.id) notFound();
  const user = JSON.parse(JSON.stringify(profile));
  const links = user.links || [];
  // Server render timestamp seeds React Query freshness for the cached response.
  // eslint-disable-next-line react-hooks/purity
  const fetchedAt = Date.now();
  return (
    <Profile
      handle={handle}
      initialUser={user}
      initialLinks={links}
      initialFetchedAt={fetchedAt}
    />
  );
}
