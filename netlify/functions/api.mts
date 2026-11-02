// Netlify function: serves the madingo API under /api/*
process.env.SERVERLESS = '1';
let cachedHandler: ((req: any, ctx: any) => Promise<any>) | null = null;

function applyDbUrlEnv() {
  const dbUrl =
    process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '';
  if (dbUrl && !process.env.SQL_HOST) {
    try {
      const u = new URL(dbUrl);
      process.env.SQL_HOST = u.hostname;
      process.env.SQL_PORT = u.port || '5432';
      process.env.SQL_DB_NAME = (u.pathname || '').replace(/^\//, '');
      process.env.SQL_USER = decodeURIComponent(u.username || '');
      process.env.SQL_PASSWORD = decodeURIComponent(u.password || '');
    } catch {
      // ignore malformed url; server.ts will surface a clearer error
    }
  }
}

async function toV1Event(req: any): Promise<any> {
  const isWebRequest =
    req &&
    typeof req.method === 'string' &&
    typeof req.url === 'string' &&
    typeof req.text === 'function' &&
    req.headers &&
    typeof req.headers.forEach === 'function' &&
    !req.httpMethod;
  if (!isWebRequest) return req;
  const url = new URL(req.url);
  const headers: Record<string, string> = {};
  (req.headers as Headers).forEach((v: string, k: string) => {
    headers[k] = v;
  });
  let body: string | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }
  return {
    httpMethod: req.method,
    path: url.pathname,
    headers,
    rawQuery: url.search ? url.search.slice(1) : '',
    body,
    isBase64Encoded: false,
    requestContext: { http: { method: req.method, path: url.pathname } },
  };
}

function toResponse(result: any, wasWebRequest: boolean) {
  if (!wasWebRequest) return result;
  if (
    result &&
    typeof result.statusCode === 'number' &&
    typeof Response !== 'undefined'
  ) {
    const headers: Record<string, string> = {};
    for (const h of [result.headers, result.multiValueHeaders]) {
      if (!h) continue;
      for (const [k, v] of Object.entries(h)) {
        (headers as any)[k.toLowerCase()] = Array.isArray(v)
          ? v.join(', ')
          : String(v);
      }
    }
    return new Response(
      result.body == null ? null : String(result.body),
      { status: result.statusCode, headers }
    );
  }
  return result;
}

export default async (req: any, ctx: any) => {
  if (!cachedHandler) {
    applyDbUrlEnv();
    const serverlessHttp = (await import('serverless-http')).default;
    const serverMod: any = await import('../../server.ts');
    await serverMod.serverReady;
    const app = serverMod.getApiApp();
    const base = serverlessHttp(app);
    cachedHandler = async (request: any, context: any) => {
      // Netlify rewrites /api/* to the function path; map it back for express
      if (
        typeof request?.url === 'string' &&
        request.url.startsWith('/.netlify/functions/api')
      ) {
        request.url = request.url.replace('/.netlify/functions/api', '/api');
      }
      if (
        typeof request?.path === 'string' &&
        request.path.startsWith('/.netlify/functions/api')
      ) {
        request.path = request.path.replace('/.netlify/functions/api', '/api');
      }
      return base(request, context);
    };
  }
  const event = await toV1Event(req);
  const result = await cachedHandler(event, ctx);
  return toResponse(result, event !== req);
};
