import Link from 'next/link';
import { siteConfig } from '@/config/site';

const SiteHeader = () => {
  return (
    <>
      <div className="flex mx-4 gap-2">
        <Link href="/" className="items-center space-x-2 md:flex">
          <img
            src="/logotype.svg"
            alt={siteConfig.name}
            className="h-8 sm:h-9 w-auto"
          />
        </Link>
      </div>
    </>
  );
};

export default SiteHeader;
