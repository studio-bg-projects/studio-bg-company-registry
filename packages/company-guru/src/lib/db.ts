import mysql from 'mysql2/promise';
import { mysql as mysqlConfig } from './config';
import colorsUtils from '../helpers/colorsUtils';

let pool: mysql.Pool;

export const initMysql = async (): Promise<void> => {
  pool = mysql.createPool({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.username,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // @todo - load structure here await pool.execute(``);
  colorsUtils.log('success', 'MySQL connection done');
};

export const getPool = (): mysql.Pool => {
  if (!pool) {
    throw new Error('MySQL pool not initialized');
  }

  return pool;
};
