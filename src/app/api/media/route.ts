import { NextRequest, NextResponse } from 'next/server';

const MEDIA_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? 'https://88bc-2a00-f3c-21d5-0-9859-2d3-3666-9b5c.ngrok-free.app/api/v1'
).origin;

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) return new NextResponse('Missing path', { status: 400 });

  const res = await fetch(`${MEDIA_ORIGIN}${path}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });

  if (!res.ok) return new NextResponse('Not found', { status: res.status });

  const blob = await res.blob();
  return new NextResponse(blob, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
