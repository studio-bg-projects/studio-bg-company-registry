import { Storage } from './lib/storage';
import { BrraBase } from './lib/brra-base';
import dotenv from 'dotenv';

dotenv.config();

class LoadBrraData extends BrraBase {
  /**
   * Load all results without data
   */
  async loadResults() {
    let company = null;
    while (company = await this.storage.brraGetWaitingCompany()) {
      console.log(`Load company: ${company.companyId} - ${new Date().toJSON()}`);

      let data = await this.loadCompanyDeedData(company.companyId);

      if (!data?.uic) {
        console.log(`!!! Ignore !!! [${company.companyId}] missing uic parameter`);
        data = {uic: null};
      }

      await this.storage.brraCompaniesAdd(company.companyId, data);
    }
  }
}

(async () => {
  // Init db
  let db = new Storage();

  // Init the scraper
  const scraper = new LoadBrraData(db);

  // Fill missing data
  await scraper.loadResults();
})();
