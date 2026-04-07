import { config } from 'dotenv';
import path from 'path';

// Load .env.test before any module imports env vars
config({ path: path.resolve(__dirname, '../../.env.test'), override: true });
