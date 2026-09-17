export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const file = url.searchParams.get('file');

  if (!file) {
    return new Response('File parameter missing', { status: 400 });
  }

  // Strip leading slashes or redundant uploads/ prefix
  const cleanFile = file.replace(/^\/?(uploads\/)?/, '');
  const targetUrl = `https://api.full-food.hotel-familyhouse.uz/uploads/${cleanFile}`;


  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'FullFood-Vercel-Proxy/1.0',
      },
    });

    if (!upstream.ok) {
      return new Response(`Image not found: ${upstream.status}`, {
        status: upstream.status,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response('Proxy error: ' + err.message, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
