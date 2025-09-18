import { GuruBase } from './lib/guru-base';
import { Storage } from './lib/storage';
import { guruSettings } from './settings';
import { Tools } from './lib/tools';
import moment from 'moment';
import dotenv from 'dotenv';

dotenv.config();

class GetGuruAllCompanies extends GuruBase {
  /**
   * Load all results split by date
   */
  async loadResults() {
    for (const [dateFrom, dateTo] of guruSettings.dateChunks) {
      const continuesKey = `GET-ALL > CHUNK: ${dateFrom.format('YYYY-MM-DD')} <> ${dateTo.format('YYYY-MM-DD')}`;
      console.log(continuesKey);

      // Check for continues
      if (await this.storage.cacheContinuesGet(continuesKey)) {
        console.log('CONTINUES SKIP :)');
        continue;
      }

      for (let rTry = 1; rTry <= 5; rTry++) {
        try {
          await this.advancedSearch({}, null, {
            dateFrom,
            dateTo,
          });

          // Save continues
          await this.storage.cacheContinuesAdd(continuesKey, moment().format('YYYY-MM-DD'));

          // Break the check
          break;
        } catch (e) {
          console.log(`>>> ROOT FAIL / TRY ${rTry} /  SLEEP 10sec. <<<`);
          console.error(e);
          await Tools.sleep(10000);
        }
      }
    }
  }
}

(async () => {
  // Init db
  let db = new Storage();

  // Init the scraper
  const scraper = new GetGuruAllCompanies(db);

  // Login (check the base class)
  await scraper.login();

  // Get main activities data before continue
  await scraper.loadResults();
})();
