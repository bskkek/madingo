import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: 'netlify/database/migrations',
  dbCredentials: {
    url:
      process.env.NETLIFY_DB_URL ||
      process.env.DATABASE_URL ||
      process.env.SQL_DB_URL ||
      '',
  },
})
