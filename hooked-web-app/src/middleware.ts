import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  
  // Enhanced mobile device detection
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i
  const tabletRegex = /iPad|Android.*Tablet|Windows.*Touch|Kindle|Silk.*Accelerated|PlayBook/i
  
  const isMobile = mobileRegex.test(userAgent)
  const isTablet = tabletRegex.test(userAgent)
  const isMobileDevice = isMobile || isTablet
  
  // Get the pathname
  const { pathname } = request.nextUrl
  
  // Skip redirect for API routes, static files, and the mobile-only-access page
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_static') ||
    pathname.includes('.') ||
    pathname === '/mobile-only-access'
  ) {
    return NextResponse.next()
  }
  
  // Redirect desktop users to mobile-only-access page
  if (!isMobileDevice && pathname !== '/mobile-only-access') {
    const url = request.nextUrl.clone()
    url.pathname = '/mobile-only-access'
    return NextResponse.redirect(url)
  }
  
  // Add mobile detection headers for client-side use
  const response = NextResponse.next()
  response.headers.set('X-Is-Mobile', isMobileDevice ? 'true' : 'false')
  response.headers.set('X-Device-Type', isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop')
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}