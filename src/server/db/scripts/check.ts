import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const client = neon(process.env.DATABASE_URL!);

async function checkColumns() {
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  console.log("User columns:", JSON.stringify(result, null, 2));
}

checkColumns().then(() => console.log("Done")).catch(console.error);