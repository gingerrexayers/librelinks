import Link from 'next/link';
import Logotype from '@/components/utils/logotype';

const SiteHeader = () => {
  return (
    <>
      <div className="flex mx-4 gap-2">
        <Link href="/" className="items-center space-x-2 md:flex">
          <Logotype className="h-8 sm:h-9 w-auto text-slate-900" />
        </Link>
      </div>
    </>
  );
};

export default SiteHeader;
