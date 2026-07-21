import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "1234",
  database: process.env.DB_NAME || "coffee_expressdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false, // ✅ Required for Aiven
  },
});

export function getPool() {
  return pool;
}

export async function query(sql, values) {
  const [rows] = await pool.query(sql, values);
  return rows;
}
