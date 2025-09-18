import { GuruBase } from './lib/guru-base';
import { Storage } from './lib/storage';
import { guruSettings } from './settings';
import { Tools } from './lib/tools';
import moment from 'moment';
import dotenv from 'dotenv';

dotenv.config();

class GetGuruByMainActivity extends GuruBase {
  protected mainActivities?: any[];

  /**
   * Get all main activities and store them in a file
   */
  async getMainActivities() {
    // Get main activities list
    const rs = await this.getFiltersData();

    // Check the response
    if (!rs?.data?.mainActivity?.length) {
      throw new Error('getMainActivities() >> rs.data.mainActivity is missing from the response');
    }

    // Save the data
    await this.storage.guruMainActivitySet(rs.data.mainActivity);

    // Store as class property
    this.mainActivities = await this.storage.guruMainActivityList();
  }

  /**
   * Load all results split by activity
   */
  async loadResults() {
    if (!Array.isArray(this.mainActivities)) {
      return;
    }

    for (let i = 0; i < this.mainActivities.length; i++) {
      const activity = this.mainActivities[i];

      for (const [dateFrom, dateTo] of guruSettings.dateChunks) {
        let activityFilter = {
          mainActivity: [activity.cid],
        };

        const continuesKey = `ACTIVITY > CID: ${activity.cid} / CODE: ${activity.code} / CHUNK: ${dateFrom.format('YYYY-MM-DD')} <> ${dateTo.format('YYYY-MM-DD')}`;
        console.log(`\n${continuesKey} / LEFT: ${this.mainActivities.length - i}`);

        // Check for continues
        if (await this.storage.cacheContinuesGet(continuesKey)) {
          console.log('CONTINUES SKIP :)');
          continue;
        }

        for (let rTry = 1; rTry <= 5; rTry++) {
          try {
            await this.advancedSearch(activityFilter, (company) => {
              company.activityCid = activity.cid;
              return company;
            }, {
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
}

(async () => {
  // Init db
  let db = new Storage();

  // Init the scraper
  const scraper = new GetGuruByMainActivity(db);

  // Login (check the base class)
  await scraper.login();

  // Get main activities data before continue
  await scraper.getMainActivities();

  // Get main activities data before continue
  await scraper.loadResults();
})();
