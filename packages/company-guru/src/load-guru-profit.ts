import { GuruBase } from './lib/guru-base';
import { Storage } from './lib/storage';
import { Tools } from './lib/tools';
import moment from 'moment';
import dotenv from 'dotenv';

dotenv.config();

class LoadGuruProfit extends GuruBase {
  protected financialYearMin?: number;
  protected financialYearMax?: number;
  protected rangeNetProfitMin?: number;
  protected rangeNetProfitMax?: number;

  /**
   * Get the profit ranges
   */
  async getProfitRanges() {
    // Get main activities list
    const rs = await this.getFiltersData();

    if (
      !rs?.data?.finYear?.min
      || !rs?.data?.finYear?.max
      || !rs?.data?.netResult?.min
      || !rs?.data?.netResult?.max
    ) {
      throw new Error('getMainActivities() >> rs.data.mainActivity is missing from the response');
    }

    this.financialYearMin = rs.data.finYear.min;
    this.financialYearMax = rs.data.finYear.max;
    this.rangeNetProfitMin = rs.data.netResult.min;
    this.rangeNetProfitMax = rs.data.netResult.max;
  }

  /**
   * Load all results split by activity
   */
  async loadResults() {
    if (
      typeof this.financialYearMin !== 'number'
      || typeof this.financialYearMax !== 'number'
      || typeof this.rangeNetProfitMin !== 'number'
      || typeof this.rangeNetProfitMax !== 'number'
    ) {
      return;
    }

    this.financialYearMin = 2019;
    this.financialYearMax = 2021;
    this.rangeNetProfitMin = -10000; // @todo
    this.rangeNetProfitMax = 1000000; // @todo

    const step = 1000;
    const steps = Math.ceil((this.rangeNetProfitMax - this.rangeNetProfitMin) / step);

    const dateFrom = this.dateFrom.clone();
    const dateTo = this.dateTo.clone();

    for (let year = this.financialYearMax; year >= this.financialYearMin; year--) {
      for (let profitStep = 1; profitStep <= steps; profitStep++) {
        const profitFrom = profitStep * step;
        const profitTo = profitStep * step + step;

        const activityFilter = {
          finYear: year,
          netResult: {
            min: profitFrom,
            max: profitTo,
          },
        };

        const continuesKey = `PROFIT > PROFIT: ${profitFrom} - ${profitTo} / RANGE: ${dateFrom.format('YYYY-MM-DD')} <> ${dateTo.format('YYYY-MM-DD')}`;
        console.log(`\n${continuesKey} / LEFT: ${steps - profitStep}`);

        // Check for continues
        if (await this.storage.cacheContinuesGet(continuesKey)) {
          console.log('CONTINUES SKIP :)');
          continue;
        }

        for (let rTry = 1; rTry <= 5; rTry++) {
          try {
            await this.advancedSearch(activityFilter, (company) => {
              // @todo delete with next commit
              {
                if (company.netProfitFrom) {
                  delete company.netProfitFrom;
                }
                if (company.netProfitTo) {
                  delete company.netProfitTo;
                }
              }

              if (!company.netProfit) {
                company.netProfit = {};
              }

              company.netProfit[year] = {
                from: profitFrom,
                to: profitTo,
              };
              return company;
            }, {
              dateFrom: dateFrom.clone(),
              dateTo: dateTo.clone(),
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
  const scraper = new LoadGuruProfit(db);

  // Login (check the base class)
  await scraper.login();

  // Get profit rangers before continue
  await scraper.getProfitRanges();

  // Get main activities data before continue
  await scraper.loadResults();
})();
