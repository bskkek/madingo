// Netlify function: serves the madingo API under /api/*
process.env.SERVERLESS = '1';
let cachedHandler: ((req: any, ctx: any) => Promise<any>) | null = null;

function applyDbUrlEnv() {
  const dbUrl =
    process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '';
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

export default async (req: any, ctx: any) => {
  if (!cachedHandler) {
    applyDbUrlEnv();
    const serverlessHttp = (await import('serverless-http')).default;
    const serverMod: any = await import('../../server.ts');
    await serverMod.serverReady;
    const app = serverMod.getApiApp();
    const base = serverlessHttp(app);
    cachedHandler = (request: any, context: any) => {
      // Netlify rewrites /api/* to the function path; map it back for express
      if (
        typeof request?.url === 'string' &&
        request.url.startsWith('/.netlify/functions/api')
      ) {
        request.url = request.url.replace('/.netlify/functions/api', '/api');
      }
      return base(request, context);
    };
  }
  return cachedHandler(req, ctx);
};
