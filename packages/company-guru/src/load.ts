import type { RowDataPacket } from 'mysql2';

import { getPool, initMysql } from './lib/db';

const createTestTableQuery = `
  CREATE TABLE IF NOT EXISTS test (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

(async () => {
  let pool: ReturnType<typeof getPool> | null = null;

  try {
    await initMysql();

    pool = getPool();

    await pool.execute(createTestTableQuery);

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, created_at, updated_at FROM test ORDER BY id ASC'
    );

    console.log('Fetched rows from test table:', rows);
  } catch (error) {
    console.error('Failed to initialize test table:', error);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
})();
