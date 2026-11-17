/**
 * Builds the mysql2 connection options from environment variables.
 * Works with a local MySQL (DB_* values) or a hosted one (DATABASE_URL).
 * Query parameters in DATABASE_URL (e.g. ?ssl-mode=REQUIRED) are read here and
 * not passed to mysql2, which avoids "invalid configuration option" warnings.
 */
function buildConfig({ withDatabase = true } = {}) {
  const env = process.env;
  let cfg;
  let sslFromUrl = false;

  if (env.DATABASE_URL) {
    const u = new URL(env.DATABASE_URL);
    cfg = {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')) || env.DB_NAME || 'batloung_farm',
    };
    const mode = (u.searchParams.get('ssl-mode') || u.searchParams.get('sslmode') || u.searchParams.get('ssl') || '').toLowerCase();
    sslFromUrl = ['required', 'verify_ca', 'verify_identity', 'true', '1'].includes(mode);
  } else {
    cfg = {
      // 127.0.0.1 (not 'localhost'): Node 18+ tries IPv6 (::1) first and XAMPP only listens on IPv4
      host: env.DB_HOST || '127.0.0.1',
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'batloung_farm',
    };
  }

  if (!withDatabase) delete cfg.database;
  if (env.DB_SSL === 'true' || sslFromUrl) cfg.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: false };
  return cfg;
}

module.exports = { buildConfig };
