import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const client = neon(process.env.DATABASE_URL!);

async function check() {
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'sessions'
  `);
  console.log("Sessions columns:", result);
}

check().then(() => console.log("Done")).catch(console.error);