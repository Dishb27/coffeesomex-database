import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// ----- SSL CONFIGURATION -----
// Use CA certificate if provided, else fallback to rejectUnauthorized
let sslConfig = { rejectUnauthorized: false };

const caPath = process.env.DB_SSL_CA_PATH
  ? path.join(process.cwd(), process.env.DB_SSL_CA_PATH)
  : null;

if (caPath && fs.existsSync(caPath)) {
  sslConfig = { ca: fs.readFileSync(caPath) };
} else if (caPath) {
  console.warn(
    `CA certificate file not found at ${caPath}, falling back to rejectUnauthorized: false`
  );
}

// ----- POOL CREATION -----
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 60000,      // 60 sec for initial connection
  acquireTimeout: 60000,      // 60 sec to get a connection from pool
});

// ----- EXPORT HELPER FUNCTIONS -----
export function getPool() {
  return pool;
}

export async function query(sql, values) {
  const [rows] = await pool.query(sql, values);
  return rows;
}

// Export default for convenience (some imports might use it)
export default pool;
