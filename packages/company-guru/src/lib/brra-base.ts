import { Storage } from './storage';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { Tools } from './tools';

export interface IRequestSettings {
  cache: boolean;
}

export abstract class BrraBase {
  protected url = 'https://portal.registryagency.bg';
  protected sleepOnRequest = 11.5 * 1000;
  protected sleepOnTooManyRequests = 20 * 1000;

  /**
   * Class constructor
   */
  constructor(protected storage: Storage) {
  }

  async loadCompanyDeedData(companyId: string) {
    // Make request
    const rs = await this.request(`/CR/api/Deeds/${companyId}`, {
      cache: false,
    });

    // Sleep before provide the response
    await Tools.sleep(this.sleepOnRequest);

    // Response
    return rs;
  }

  /**
   * Make request to brra
   */
  protected async request(path: string, settings: IRequestSettings): Promise<any> {
    for (let rTry = 1; rTry <= 100; rTry++) {
      let url = `${this.url}${path}`;

      // Request hash
      const hashLib = crypto.createHash('sha1');
      const hash = hashLib.update(url).digest('hex');

      // Check for cache
      if (settings.cache) {
        const cacheData = await this.storage.cacheRequestGet(hash);
        if (cacheData) {
          return cacheData;
        }
      }

      // Make request
      const requestSettings = {
        'headers': {},
        'method': 'GET',
      };
      const response = await fetch(url, requestSettings) as any;

      // Check
      if (response.status === 429) {
        console.log(`rTry: ${rTry}; Status 429 (TOO MANY REQUESTS). Sleep for ${this.sleepOnTooManyRequests / 1000} sec`);

        // Sleep before try again
        await Tools.sleep(this.sleepOnTooManyRequests);

        // Try again
        continue;
      }

      try {
        return await response.json();
      } catch {
        console.log(`Wrong JSON response for ${url}`);
        return null;
      }
    }
  }
}
