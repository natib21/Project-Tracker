import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Local development: load the .env from the repo root.
// In Docker/Render the file doesn't exist and real environment variables are used.
config({ path: join(__dirname, '..', '..', '..', '..', '.env') });

// 'ts' when running from source (ts-node), 'js' when running the compiled build
const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [join(__dirname, '..', 'modules', '**', 'entities', `*.entity.${ext}`)],
  migrations: [join(__dirname, 'migrations', `*.${ext}`)],
});