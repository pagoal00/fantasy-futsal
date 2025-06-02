import mysql from "mysql2";

const pool = mysql.createPool({
  host: "mysql-fantasyfutsal.alwaysdata.net",
  user: "416217",
  password: "FantasyFutsal_Pablo00",
  database: "fantasyfutsal_futsal",
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool.promise();
