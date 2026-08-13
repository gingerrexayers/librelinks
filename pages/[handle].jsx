/* eslint-disable @next/next/no-img-element */
import LinkCard from '@/components/core/user-profile/links-card';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import useUser from '@/hooks/useUser';
import Loader from '@/components/utils/loading-spinner';
import NotFound from '@/components/utils/not-found';
import useLinks from '@/hooks/useLinks';
import { SocialCards } from '@/components/core/user-profile/social-cards';
import Head from 'next/head';
import { Drawer } from 'vaul';
import useMediaQuery from '@/hooks/use-media-query';
import { siteConfig } from '@/config/site';
import { db } from '@/lib/db';

const LOCAL_LOCATION_FALLBACK = {
  countryCode: 'GH',
  city: 'Accra',
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  handle: true,
  bio: true,
  image: true,
  buttonStyle: true,
  themePalette: true,
  links: {
    orderBy: {
      order: 'asc',
    },
    select: {
      id: true,
      title: true,
      url: true,
      archived: true,
      order: true,
      isSocial: true,
    },
  },
};

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function isHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function getColorScheme(hex) {
  if (!isHexColor(hex)) {
    return 'light';
  }

  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.5 ? 'dark' : 'light';
}

function getThemePrimary(themePalette) {
  const primary = themePalette?.palette?.[0];
  return isHexColor(primary) ? primary.trim() : '';
}

async function getPublicProfile(handle) {
  const existingUser = await db.user.findUnique({
    where: {
      handle,
    },
    select: PUBLIC_PROFILE_SELECT,
  });

  if (existingUser?.id) {
    return existingUser;
  }

  const matchingUsers = await db.user.aggregateRaw({
    pipeline: [
      {
        $match: {
          handle: {
            $regex: `^\\s*${escapeRegex(handle)}\\s*$`,
            $options: 'i',
          },
        },
      },
      {
        $project: {
          _id: 1,
        },
      },
      {
        $limit: 1,
      },
    ],
  });

  const matchedUserId =
    typeof matchingUsers[0]?._id === 'string'
      ? matchingUsers[0]._id
      : matchingUsers[0]?._id?.$oid;

  if (typeof matchedUserId !== 'string') {
    return null;
  }

  return db.user.findUnique({
    where: {
      id: matchedUserId,
    },
    select: PUBLIC_PROFILE_SELECT,
  });
}

const ProfilePage = ({
  initialHandle,
  initialUser = null,
  initialLinks = null,
  initialFetchedAt = 0,
} = {}) => {
  const { asPath, query } = useRouter();
  const handle = initialHandle ?? query.handle;
  const normalizedHandle =
    typeof handle === 'string' ? handle.trim().toLowerCase() : undefined;
  const isRootProfile = asPath === '/' || asPath.startsWith('/?');
  const [previewUserOverride, setPreviewUserOverride] = useState(null);
  const [isBioDrawerOpen, setIsBioDrawerOpen] = useState(false);
  const [isBioTruncated, setIsBioTruncated] = useState(false);
  const bioRef = useRef(null);

  const { isMobile } = useMediaQuery();

  const {
    data: fetchedUser,
    isLoading: isUserLoading,
    isFetching: isUserFetching,
  } = useUser(normalizedHandle, {
    initialData: initialUser ?? undefined,
    initialDataUpdatedAt: initialUser ? initialFetchedAt : undefined,
  });

  const { data: userLinks, isFetching: isLinksFetching } = useLinks(
    fetchedUser?.id,
    {
      initialData: initialLinks ?? undefined,
      initialDataUpdatedAt: initialLinks ? initialFetchedAt : undefined,
    }
  );

  const queryClient = useQueryClient();
  const [, setIsDataLoaded] = useState(false);
  const sourceBio = previewUserOverride?.bio ?? fetchedUser?.bio ?? '';

  const mutation = useMutation(
    async (id) => {
      await axios.patch(`/api/analytics/clicks/${id}`);
    },
    {
      onError: (error) => {
        toast.error(
          (error.response && error.response.data.message) || 'An error occurred'
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['links', fetchedUser?.id] });
      },
    }
  );

  const handleRegisterClick = async (id) => {
    await mutation.mutateAsync(id);
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'preview-update' && event.data.payload) {
        setPreviewUserOverride((currentOverride) => ({
          ...currentOverride,
          ...event.data.payload,
        }));
      }

      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['user', normalizedHandle] });
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [normalizedHandle, queryClient]);

  useEffect(() => {
    if (fetchedUser && userLinks) {
      setIsDataLoaded(true);
    }
  }, [fetchedUser, userLinks]);

  useEffect(() => {
    if (!fetchedUser) {
      return;
    }

    setPreviewUserOverride(null);
  }, [fetchedUser]);

  useEffect(() => {
    if (!normalizedHandle || query.isIframe) {
      return;
    }

    const trackingKey = `profile-view:${normalizedHandle}`;
    if (window.sessionStorage.getItem(trackingKey)) {
      return;
    }

    let isCancelled = false;

    const trackView = async () => {
      try {
        await axios.post(
          `/api/users/${normalizedHandle}`,
          getBrowserTrackingPayload()
        );
        if (!isCancelled) {
          window.sessionStorage.setItem(trackingKey, 'tracked');
        }
      } catch {
      }
    };

    trackView();

    return () => {
      isCancelled = true;
    };
  }, [normalizedHandle, query.isIframe]);

  useEffect(() => {
    const checkBioTruncation = () => {
      if (!bioRef.current || !sourceBio) {
        setIsBioTruncated(false);
        return;
      }

      const element = bioRef.current;
      setIsBioTruncated(element.scrollWidth > element.clientWidth);
    };

    checkBioTruncation();
    window.addEventListener('resize', checkBioTruncation);

    return () => {
      window.removeEventListener('resize', checkBioTruncation);
    };
  }, [sourceBio]);

  const pageBackground = getThemePrimary(fetchedUser?.themePalette);
  const pageTitle =
    (previewUserOverride?.name ?? fetchedUser?.name)?.trim() ||
    fetchedUser?.handle ||
    normalizedHandle ||
    '';

  useEffect(() => {
    if (!pageBackground) {
      return;
    }

    const root = document.documentElement;
    const { body } = document;
    const previousHtmlBackground = root.style.backgroundColor;
    const previousBodyBackground = body.style.backgroundColor;
    const previousColorScheme = root.style.colorScheme;

    root.style.backgroundColor = pageBackground;
    body.style.backgroundColor = pageBackground;
    root.style.colorScheme = getColorScheme(pageBackground);

    return () => {
      root.style.backgroundColor = previousHtmlBackground;
      body.style.backgroundColor = previousBodyBackground;
      root.style.colorScheme = previousColorScheme;
    };
  }, [pageBackground]);

  if (isUserLoading && !initialUser) {
    return (
      <>
        <ProfileDocumentHead
          pageTitle={pageTitle}
          pageDescription={sourceBio}
          canonicalUrl={
            isRootProfile ? siteConfig.url : `${siteConfig.url}/${normalizedHandle}`
          }
          image={siteConfig.ogImage}
          themePrimary={pageBackground}
        />
        <div
          className="min-h-screen min-h-[100dvh] w-full"
          style={pageBackground ? { background: pageBackground } : undefined}
        >
          <Loader
            message={'Loading...'}
            bgColor="black"
            textColor="black"
            fullPage
          />
        </div>
      </>
    );
  }

  if (!fetchedUser?.id) {
    return <NotFound />;
  }

  const displayUser = previewUserOverride
    ? {
        ...fetchedUser,
        ...previewUserOverride,
      }
    : fetchedUser;

  const buttonStyle = displayUser?.buttonStyle;
  const pageDescription =
    displayUser?.bio ||
    `${displayUser?.name || displayUser?.handle || normalizedHandle}'s page.`;
  const canonicalUrl = isRootProfile
    ? siteConfig.url
    : `${siteConfig.url}/${displayUser?.handle || normalizedHandle}`;
  const theme = {
    primary: pageBackground || displayUser?.themePalette?.palette?.[0],
    secondary: displayUser?.themePalette?.palette?.[1],
    accent: displayUser?.themePalette?.palette?.[2],
    neutral: displayUser?.themePalette?.palette?.[3],
  };

  return (
    <>
      <ProfileDocumentHead
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        canonicalUrl={canonicalUrl}
        image={displayUser?.image || siteConfig.ogImage}
        themePrimary={theme.primary}
      />
      <section
        style={{ background: theme.primary }}
        className="min-h-screen min-h-[100dvh] w-full max-w-full"
      >
        {displayUser?.image && (
          <div
            className="flex w-full justify-center overflow-hidden border-b-2"
            style={{ borderColor: theme.neutral }}
          >
            <img
              src={displayUser?.image}
              referrerPolicy="no-referrer"
              alt="header"
              className="block h-auto w-auto max-w-full"
            />
          </div>
        )}
        <div className="flex items-center w-full mt-4 flex-col mx-auto max-w-3xl justify-center px-14 sm:px-16 lg:px-8 lg:mt-16">
          {(isLinksFetching || isUserFetching) && (
            <div className="absolute -top-5 left-2">
              <Loader
                strokeWidth={7}
                width={15}
                height={15}
                bgColor={theme.accent}
              />
            </div>
          )}
          <p
            style={{ color: theme.accent }}
            className="font-coert text-white text-center text-xl mt-4 mb-2 lg:mt-4"
          >
            {displayUser?.name}
          </p>
          {displayUser?.bio && (
            <>
              <p
                ref={bioRef}
                style={{ color: theme.accent }}
                className="w-[270px] truncate text-center text-sm mt-1 lg:text-xl lg:w-[600px]"
              >
                {displayUser?.bio}
              </p>

              {isBioTruncated &&
                (isMobile ? (
                  <Drawer.Root
                    open={isBioDrawerOpen}
                    onOpenChange={setIsBioDrawerOpen}
                    shouldScaleBackground
                  >
                    <Drawer.Trigger asChild>
                      <button
                        style={{ color: theme.accent }}
                        className="mb-4 text-xs underline underline-offset-4 lg:text-sm"
                        type="button"
                      >
                        View full bio
                      </button>
                    </Drawer.Trigger>
                    <Drawer.Portal>
                      <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                      <Drawer.Content className="bg-white p-6 flex flex-col rounded-t-2xl h-[45%] mt-24 fixed bottom-0 left-0 right-0">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 mb-6" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-3">
                          Bio
                        </h3>
                        <p className="text-slate-700 whitespace-pre-wrap break-words overflow-y-auto">
                          {displayUser?.bio}
                        </p>
                      </Drawer.Content>
                    </Drawer.Portal>
                  </Drawer.Root>
                ) : (
                  <Dialog.Root>
                    <Dialog.Trigger asChild>
                      <button
                        style={{ color: theme.accent }}
                        className="mb-4 text-xs underline underline-offset-4 lg:text-sm"
                        type="button"
                      >
                        View full bio
                      </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 backdrop-blur-sm bg-gray-800 bg-opacity-50 sm:w-full" />
                      <Dialog.Content className="contentShow fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 sm:p-8 lg:max-w-3xl w-[350px] sm:w-[500px] shadow-lg md:max-w-lg max-md:max-w-lg focus:outline-none">
                        <Dialog.Title className="text-lg font-semibold text-slate-900 mb-3">
                          Bio
                        </Dialog.Title>
                        <p className="text-slate-700 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
                          {displayUser?.bio}
                        </p>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                ))}
            </>
          )}
          <div className="flex flex-wrap justify-center gap-2 mb-8 lg:w-fit lg:gap-4">
            {userLinks
              ?.filter((link) => link.isSocial && !link.archived)
              .map(({ id, title, url }) => {
                return (
                  <SocialCards
                    key={title}
                    title={title}
                    url={url}
                    color={theme.accent}
                    registerClicks={() => handleRegisterClick(id)}
                  />
                );
              })}
          </div>
          {userLinks
            ?.filter((link) => !link.isSocial)
            .map(({ id, ...link }) => (
              <LinkCard
                buttonStyle={buttonStyle}
                theme={theme}
                id={id}
                key={id}
                {...link}
                registerClicks={() => handleRegisterClick(id)}
              />
            ))}

          {userLinks?.length === 0 && (
            <div className="flex justify-center">
              <h3
                style={{ color: theme.neutral }}
                className="pt-8 text-md text-white font-semibold lg:text-2xl"
              >
                No links added yet
              </h3>
            </div>
          )}
        </div>
        <div className="my-10 lg:my-24" />
      </section>
    </>
  );
};

function getBrowserTrackingPayload() {
  const hostname = window.location.hostname;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cityFromTimezone = timezone?.split('/').pop()?.replace(/_/g, ' ');
  const isTouchDevice = navigator.maxTouchPoints > 0;
  const userAgent = navigator.userAgent.toLowerCase();

  let browserDevice = 'desktop';
  if (/ipad|tablet/.test(userAgent)) {
    browserDevice = 'tablet';
  } else if (/iphone|android.+mobile|mobile/.test(userAgent) || isTouchDevice) {
    browserDevice = 'mobile';
  }

  const browserLocation = {
    hostname,
    city: cityFromTimezone || LOCAL_LOCATION_FALLBACK.city,
    countryCode:
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.local')
        ? LOCAL_LOCATION_FALLBACK.countryCode
        : undefined,
  };

  return {
    browserDevice,
    browserLocation,
    browserReferrer: document.referrer,
  };
}

function ProfileDocumentHead({
  pageTitle,
  pageDescription,
  canonicalUrl,
  image,
  themePrimary,
}) {
  const colorScheme = getColorScheme(themePrimary);

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      {themePrimary ? <meta name="theme-color" content={themePrimary} /> : null}
      <meta name="color-scheme" content={colorScheme} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="profile" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:alt" content={pageTitle} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={siteConfig.twitterHandle} />
      <meta name="twitter:creator" content={siteConfig.twitterHandle} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />
      {themePrimary ? (
        <style>{`html,body,#__next{background:${themePrimary};min-height:100%;color-scheme:${colorScheme}}`}</style>
      ) : null}
    </Head>
  );
}

export default ProfilePage;

export async function getServerSideProps(context) {
  const incomingHandle = context?.params?.handle ?? context?.query?.handle;

  if (typeof incomingHandle !== 'string') {
    return { notFound: true };
  }

  const canonicalHandle = incomingHandle.trim().toLowerCase();

  if (!canonicalHandle) {
    return { notFound: true };
  }

  if (incomingHandle !== canonicalHandle) {
    const query = { ...context.query };
    delete query.handle;
    const searchParams = new URLSearchParams(query).toString();

    return {
      redirect: {
        destination: `/${canonicalHandle}${searchParams ? `?${searchParams}` : ''}`,
        permanent: true,
      },
    };
  }

  const profile = await getPublicProfile(canonicalHandle);

  if (!profile?.id) {
    return { notFound: true };
  }

  const { links = [], ...user } = toPlain(profile);

  return {
    props: {
      initialUser: user,
      initialLinks: links,
      initialFetchedAt: Date.now(),
    },
  };
}
