import { getPool, initMysql } from './lib/db';

(async () => {
  await initMysql();

  getPool(); // @todo create table test
})();
