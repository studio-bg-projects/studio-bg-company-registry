import mysql from 'mysql2/promise';
import { mysql as mysqlConfig } from './config';

let pool: mysql.Pool;

export const initMysql = async (): Promise<void> => {
  if (pool) {
    return;
  }

  pool = mysql.createPool({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.username,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
  });
};

export const getPool = async (): Promise<mysql.Pool> => {
  await initMysql();

  return pool;
};

export const createStructure = async () => {
  pool = await getPool();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS test (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};
