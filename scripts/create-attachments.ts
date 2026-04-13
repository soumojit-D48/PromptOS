import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function createTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS prompt_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        url text NOT NULL,
        name text NOT NULL,
        size integer NOT NULL,
        type text NOT NULL,
        uploaded_by uuid NOT NULL REFERENCES users(id),
        created_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log('Table created successfully');
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

createTable();