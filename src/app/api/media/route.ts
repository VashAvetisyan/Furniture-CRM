import { NextRequest, NextResponse } from 'next/server';

const MEDIA_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? 'https://a2c2-2a00-f3c-21d5-0-1cfc-b5b2-3a84-4c8a.ngrok-free.app/api/v1'
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
