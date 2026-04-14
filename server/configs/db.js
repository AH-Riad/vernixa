import dotenv from "dotenv";
dotenv.config();
import { neon } from "@neondatabase/serverless";

let sql;

export function getDb() {
  if (!sql) {
    const url = process.env.DATABASE_URL;

    if (!url) {
      throw new Error("DATABASE_URL missing. .env not loaded correctly.");
    }

    sql = neon(url);
  }

  return sql;
}

export default getDb();
