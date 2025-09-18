import type { RowDataPacket } from 'mysql2';

import { createStructure, getPool } from './lib/db';

(async () => {
  await createStructure();

  const pool = await getPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, created_at, updated_at FROM test ORDER BY id ASC',
  );

  console.log('rows', rows);

  await pool.end();
})();
