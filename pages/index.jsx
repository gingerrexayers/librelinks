import { siteConfig } from '@/config/site';
import ProfilePage, { getServerSideProps as getProfileServerSideProps } from './[handle]';

export async function getServerSideProps(context) {
  return getProfileServerSideProps({
    ...context,
    params: {
      ...context.params,
      handle: siteConfig.rootHandle,
    },
    query: {
      ...context.query,
      handle: siteConfig.rootHandle,
    },
  });
}

export default function Home() {
  return <ProfilePage initialHandle={siteConfig.rootHandle} />;
}
