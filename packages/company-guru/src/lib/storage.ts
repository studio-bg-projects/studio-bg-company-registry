import * as process from 'node:process';
import * as mysql from 'mysql2/promise';
import { config } from './config';

export class Storage {
  protected conn: mysql.Connection | null = null;

  async guruMainActivitySet(mainActivities: any[]): Promise<void> {
    const db = await this.getDb();

    for (const item of mainActivities) {
      await db.execute(`
        INSERT IGNORE INTO
          \`guruMainActivity\`
        (
          \`cid\`,
          \`bg\`,
          \`en\`,
          \`code\`
        ) VALUES (
          :cid,
          :bg,
          :en,
          :code
        )
      `, {
        cid: Number(item.cid),
        bg: item.bg,
        en: item.en,
        code: item.code,
      });
    }
  }

  async guruMainActivityList(): Promise<any[]> {
    const db = await this.getDb();

    const stm = <any>await db.execute(`
      SELECT
        *
      FROM
        \`guruMainActivity\`
      ORDER BY
        \`code\`
    `);

    return stm?.[0];
  }

  async cacheRequestGet(hash: string): Promise<any | null> {
    const db = await this.getDb();

    const stm = <any>await db.execute(`
      SELECT
        *
      FROM
        \`_cacheRequest\`
      WHERE
        \`hash\` = :hash
      LIMIT 1
    `, {
      hash,
    });

    return stm?.[0]?.[0];
  }

  async cacheRequestAdd(hash: string, response: any): Promise<void> {
    const db = await this.getDb();

    await db.execute(`
      INSERT INTO
        \`_cacheRequest\`
      (
        \`hash\`,
        \`response\`
      ) VALUES (
        :hash,
        :response
      )
    `, {
      hash: hash,
      response: JSON.stringify(response),
    });
  }

  async cacheContinuesGet(key: string): Promise<any | null> {
    const db = await this.getDb();

    const stm = <any>await db.execute(`
      SELECT
        *
      FROM
        \`_cacheContinues\`
      WHERE
        \`key\` = :key
      LIMIT 1
    `, {
      key: key,
    });

    return stm?.[0]?.[0];
  }

  async cacheContinuesAdd(key: string, date: string): Promise<void> {
    const db = await this.getDb();

    await db.execute(`
      INSERT INTO
        \`_cacheContinues\`
      (
        \`key\`,
        \`date\`
      ) VALUES (
        :key,
        :date
      )
    `, {
      key: key,
      date: date,
    });
  }

  async guruCompanyGet(companyId: string): Promise<any> {
    const db = await this.getDb();

    const stm = <any>await db.execute(`
      SELECT
        *
      FROM
        \`guruCompanies\`
      WHERE
        \`companyId\` = :companyId
      LIMIT 1
    `, {
      companyId,
    });

    const rs = stm?.[0]?.[0];

    return rs?.data || null;
  }

  async guruCompanySet(companyId: string, data: any): Promise<void> {
    const db = await this.getDb();

    let existingCompany = await this.guruCompanyGet(companyId);

    if (existingCompany) {
      data = {
        ...existingCompany,
        ...data,
      };

      if (this.isEqual(data, existingCompany)) {
        return;
      }

      await db.execute(`
        UPDATE
          \`guruCompanies\`
        SET
          \`data\` = :data
        WHERE
          \`companyId\` = :companyId
      `, {
        companyId,
        data: JSON.stringify(data),
      });
    } else {
      await db.execute(`
        INSERT INTO
          \`guruCompanies\`
        (
          \`companyId\`,
          \`data\`
        ) VALUES (
          :companyId,
          :data
        )
      `, {
        companyId,
        data: JSON.stringify(data),
      });
    }
  }

  async brraGetWaitingCompany(): Promise<any> {
    const db = await this.getDb();

    const stm = <any>await db.execute(`
        SELECT
          \`companyId\`,
          \`data\`
        FROM
          \`guruCompanies\`
        WHERE
          \`data\`->>'$.status.cid' = 1
          AND \`companyId\` NOT IN (SELECT \`companyId\` FROM \`brraCompanies\`)
        ORDER BY
          \`companyId\` DESC
        LIMIT 1
    `);

    return stm?.[0]?.[0];
  }

  async brraCompaniesAdd(companyId: string, data: any): Promise<void> {
    const db = await this.getDb();

    await db.execute(`
      INSERT INTO
        \`brraCompanies\`
      SET
        \`companyId\` = :companyId,
        \`data\` = :data
    `, {
      companyId,
      data,
    });
  }

  protected async getDb(): Promise<mysql.Connection> {
    if (!this.conn) {
      this.conn = await mysql.createConnection({
        namedPlaceholders: true,
        host: config.mysql.host,
        port: config.mysql.port,
        database: config.mysql.database,
        user: config.mysql.username,
        password: config.mysql.password,
      });

      // Cache
      await this.conn.execute(`
        CREATE TABLE IF NOT EXISTS \`_cacheRequest\`  (
          \`hash\` varchar(50) NOT NULL,
          \`response\` json NOT NULL,
          PRIMARY KEY (\`hash\`)
        );
      `);

      await this.conn.execute(`
        CREATE TABLE IF NOT EXISTS \`_cacheContinues\`  (
          \`key\` varchar(100) NOT NULL,
          \`date\` date NOT NULL,
          PRIMARY KEY (\`key\`)
        );
      `);

      // Companies
      await this.conn.execute(`
        CREATE TABLE IF NOT EXISTS \`guruCompanies\`  (
          \`companyId\` varchar(100) NOT NULL,
          \`data\` json NULL,
          PRIMARY KEY (\`companyId\`)
        );
      `);

      await this.conn.execute(`
        CREATE TABLE IF NOT EXISTS \`guruMainActivity\`  (
          \`cid\` int NOT NULL,
          \`bg\` varchar(100) NOT NULL,
          \`en\` varchar(100) NOT NULL,
          \`code\` varchar(100) NOT NULL,
          PRIMARY KEY (\`cid\`)
        );
      `);

      await this.conn.execute(`
        CREATE TABLE IF NOT EXISTS \`brraCompanies\`  (
          \`companyId\` varchar(100) NOT NULL,
          \`data\` json NULL,
          PRIMARY KEY (\`companyId\`)
        );
      `);
    }

    return this.conn;
  }

  protected isEqual(objA: any, objB: any) {
    const a = JSON.stringify(objA);
    const b = JSON.stringify(objB);

    return a == b;
  }
}
