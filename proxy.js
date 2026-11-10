import { NextResponse } from 'next/server';
import { siteConfig } from '@/config/site';

const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
  '__Host-better-auth.session_token',
];

export default async function proxy(req) {
  // Get the pathname of the request (e.g. /, /admin)
  const path = req.nextUrl.pathname;

  if (!path.includes('.') && path !== path.toLowerCase()) {
    const url = req.nextUrl.clone();
    url.pathname = path.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  if (path === '/') {
    const url = req.nextUrl.clone();
    url.pathname = `/${siteConfig.rootHandle}`;
    return NextResponse.rewrite(url);
  }

  // A list of all protected pages
  const protectedPaths = [
    '/admin',
    '/admin/customize',
    '/admin/analytics',
    '/admin/settings',
    '/onboarding',
  ];

  const session = SESSION_COOKIE_NAMES.find(
    (cookieName) => req.cookies.get(cookieName)?.value
  );

  if (!session && protectedPaths.includes(path)) {
    return NextResponse.redirect(new URL('/login', req.url));
  } else if (session && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/:handle([^/]*[A-Z][^/]*)',
    '/',
    '/admin/:path*',
    '/onboarding/:path*',
    '/login',
    '/register',
  ],
};
