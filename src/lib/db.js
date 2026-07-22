import mysql from "mysql2/promise";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
});

export function getPool() {
  return pool;
}

export async function query(sql, values) {
  const [rows] = await pool.query(sql, values);
  return rows;
}

export default pool;
