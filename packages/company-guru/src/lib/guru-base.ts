import fetch from 'node-fetch';
import moment from 'moment';
import crypto from 'crypto';
import { Storage } from './storage';
import { guruSettings } from '../settings';
import { Tools } from './tools';
import { config } from './config';

export interface IRequestSettings {
  cache: boolean;
  tryToRefreshToken: boolean;
  data: null | any;
  method: 'POST' | 'GET';
}

export interface IAdvancedDateOptions {
  skip?: number;
  dateFrom?: moment.Moment;
  dateTo?: moment.Moment;
}

export interface IAdvancedNetProfitOptions {
  skip?: number;
  netProfitFrom: number;
  netProfitTo: number;
  year: number;
}

export interface IUser {
  email: string;
  refreshToken: string;
  token: string;
  tokenExpireAt: moment.Moment;
}

export type ResultsCallback = (input: any) => any;

export abstract class GuruBase {
  // Company Guru API url
  protected url = 'https://backend.company.guru/';

  // Metrics
  protected maxResults = 5000;

  // Default metrics
  protected perPage = 50;
  protected dateFrom = moment('1800-01-01', 'YYYY-MM-DD');
  protected dateTo = moment();

  // Tokens data
  protected tokenTtl = 200;
  protected latestUsedUser: number | null = null;
  protected users: IUser[] = [];
  protected nextUserIndexToLogin = 0;
  protected userLoginPromises: Map<number, Promise<IUser>> = new Map();

  /**
   * Class constructor
   */
  constructor(protected storage: Storage) {
  }

  /**
   * Request for advanced search by date
   */
  async advancedSearch(filter: any = {}, dataAppendFn: ResultsCallback | null = null, options: IAdvancedDateOptions = {}): Promise<void> {
    // Set filter
    const dateMin = options?.dateFrom ? options.dateFrom : this.dateFrom;
    const dateMax = options?.dateTo ? options.dateTo : this.dateTo;

    filter.establishmentDate = {
      min: dateMin.format('YYYY-MM-DD'),
      max: dateMax.format('YYYY-MM-DD'),
    };

    // Options
    if (!options.skip) {
      options.skip = 0;
    }

    if (options.skip >= this.maxResults) {
      return;
    }

    // Get search results
    const rs = await this.request('app/search/advanced/', {
        cache: true,
        tryToRefreshToken: true,
        data: {
          country: 'bg',
          limit: this.perPage,
          skip: options.skip,
          ...filter,
        },
        method: 'POST',
      },
    );

    // Check total results
    const total = rs?.data?.total;
    const left = total - options.skip;
    console.log(`${filter.establishmentDate.min}\t${filter.establishmentDate.max}\tTotal: ${total}\tLeft: ${left}`);

    if (!total) {
      return;
    }

    // Extract results
    if (rs?.data?.items) {
      await this.extractResults(rs.data.items, dataAppendFn);
    }


    if (left < 0) {
      return;
    }

    // Go to next page or divide the establishment date (if the date is in 1 day then we can`t devide)
    if (total > this.maxResults && !dateMin.isSame(dateMax)) {
      const dateDiff = dateMax.diff(dateMin, 'days');

      const range1 = Math.floor(dateDiff / 2);
      const range2 = dateDiff - range1;

      const dateMin1 = dateMin.clone();
      const dateMax1 = dateMin1.clone().add(range1, 'days');

      const dateMin2 = dateMax1.clone().add(1, 'days');
      const dateMax2 = dateMin2.clone().add(range2, 'days');

      // Step 1 (half range start)
      await this.advancedSearch(filter, dataAppendFn, {
        ...options,
        ...{dateFrom: dateMin1, dateTo: dateMax1},
      });

      // Step 2 (half range end)
      await this.advancedSearch(filter, dataAppendFn, {
        ...options,
        ...{dateFrom: dateMin2, dateTo: dateMax2},
      });
    } else {
      await this.advancedSearch(filter, dataAppendFn, {
        ...options,
        ...{skip: options.skip + this.perPage},
      });
    }
  }

  /**
   * Request for quick search
   */
  async quickSearch(filter: any = {}, dataAppendFn: ResultsCallback | null = null): Promise<any> {
    // Get search results
    const rs = await this.request('app/search/quick/', {
        cache: true,
        tryToRefreshToken: true,
        data: {
          country: 'bg',
          limit: this.perPage,
          skip: 0,
          ...filter,
        },
        method: 'GET',
      },
    );

    // Extract results
    if (rs?.data) {
      await this.extractResults(rs.data, dataAppendFn);
    }

    return rs;
  }

  /**
   * Get and save the results data from the response
   */
  async extractResults(results: any[], dataAppendFn: ResultsCallback | null = null) {
    // Check each item
    for (let item of results) {
      // Run the callback data
      if (dataAppendFn) {
        item = await dataAppendFn(item);
      }

      await this.storage.guruCompanySet(item.regNo, item);
    }
  }

  /**
   * Reset login state. Users will authenticate on demand.
   */
  async login(): Promise<void> {
    this.users = [];
    this.latestUsedUser = null;
    this.nextUserIndexToLogin = 0;
    this.userLoginPromises.clear();
  }

  /**
   * Build default request headers
   */
  protected buildRequestHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'accept-language': 'en',
      'content-type': 'application/json',
      'sec-ch-ua': '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': 'https://app.company.guru/',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Login single user and return the user data
   */
  protected async loginUser(userIndex: number): Promise<IUser> {
    const credentials = config.cg.users[userIndex];

    if (!credentials) {
      throw new Error(`Missing credentials configuration for user index ${userIndex}`);
    }

    await Tools.sleep(guruSettings.requestSleepMs);

    const url = `${this.url}account/log-in/`;
    const requestSettings = {
      headers: this.buildRequestHeaders(),
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    };

    const response = await fetch(url, requestSettings) as any;
    const rs = await response.json();

    if (rs?.error) {
      console.log('!!!LOGIN ERROR!!!');
      console.log({
        error: rs.error,
        email: credentials.email,
      });
      throw new Error(`Company Guru login failed for ${credentials.email}`);
    }

    const user: IUser = {
      email: credentials.email,
      refreshToken: rs.refreshToken,
      token: rs.token,
      tokenExpireAt: moment(),
    };

    console.log(`Login token for ${credentials.email} -> ${rs.token}`);

    await this.tokenRefresh(user, true);

    this.users[userIndex] = user;
    this.latestUsedUser = userIndex;
    this.nextUserIndexToLogin = userIndex + 1;

    return user;
  }

  /**
   * Refresh the token on each N seconds
   */
  async tokenRefresh(user: IUser, forceRefresh = false): Promise<void> {
    if (!forceRefresh) {
      if (user.tokenExpireAt && user.tokenExpireAt.isAfter(moment())) {
        return;
      }
    }

    await Tools.sleep(guruSettings.requestSleepMs);

    const url = `${this.url}account/refresh/`;
    const requestSettings = {
      headers: this.buildRequestHeaders(),
      method: 'POST',
      body: JSON.stringify({
        refreshToken: user.refreshToken,
      }),
    };

    const response = await fetch(url, requestSettings) as any;
    const rs = await response.json();

    if (rs?.error) {
      console.log('!!!TOKEN REFRESH ERROR!!!');
      console.log({
        error: rs.error,
        email: user.email,
      });
      throw new Error(`Company Guru token refresh failed for ${user.email}`);
    }

    // Set tokens
    user.refreshToken = rs.refreshToken;
    user.token = rs.token;

    // Update token get time
    user.tokenExpireAt = moment().add(this.tokenTtl, 'seconds');

    console.log(`New token for ${user.email} -> ${user.token}`);
  }

  /**
   * Generate new user for the request
   */
  protected async getUserForRequest(): Promise<IUser> {
    const totalUsers = config.cg.users.length;

    if (this.nextUserIndexToLogin < totalUsers) {
      const userIndex = this.nextUserIndexToLogin;
      let loginPromise = this.userLoginPromises.get(userIndex);

      if (!loginPromise) {
        loginPromise = this.loginUser(userIndex).finally(() => {
          this.userLoginPromises.delete(userIndex);
        });
        this.userLoginPromises.set(userIndex, loginPromise);
      }

      return await loginPromise;
    }

    if (!this.users.length) {
      throw new Error('No available users configured for Company Guru requests.');
    }

    let userKey = this.latestUsedUser;

    if (userKey === null) {
      userKey = 0;
    } else {
      userKey++;
    }

    if (userKey >= this.users.length) {
      userKey = 0;
    }

    this.latestUsedUser = userKey;

    return this.users[userKey];
  }

  /**
   * Make request to company guru (by default will try to update the token)
   */
  protected async request(path: string, settings: IRequestSettings): Promise<any> {
    for (let rTry = 1; rTry <= 100; rTry++) {
      try {
        const currentUser = await this.getUserForRequest();

        if (settings.tryToRefreshToken) {
          await this.tokenRefresh(currentUser, false);
        }

        let url = `${this.url}${path}`;

        if (settings.method === 'GET' && settings.data) {
          const params = new URLSearchParams(settings.data);
          url += '?' + params.toString();
        }

        // Request hash
        const hashLib = crypto.createHash('sha1');
        const hash = hashLib.update(url + JSON.stringify(settings.data)).digest('hex');

        // Check for cache
        if (settings.cache) {
          const cacheData = await this.storage.cacheRequestGet(hash);
          if (cacheData) {
            return cacheData;
          }
        }

        // Sleep
        await Tools.sleep(guruSettings.requestSleepMs);

        // Make request
        const requestSettings = {
          'headers': this.buildRequestHeaders(currentUser?.token),
          'method': settings.method,
          ...(settings.method === 'POST' ? {
            'body': JSON.stringify(settings.data),
          } : {}),
        };
        const response = await fetch(url, requestSettings) as any;

        const rs = await response.json();

        // On error
        if (rs?.error) {
          console.log('!!!REQUEST ERROR!!!');

          console.log('Sleep for 5 sec');

          console.log({
            error: rs.error,
            currentUser: currentUser,
            tokenExpireAfter: currentUser.tokenExpireAt.diff(moment(), 'seconds'),
          });

          throw new Error('Local error throw for to try next catch');
        }

        // Store request data
        if (settings.cache) {
          await this.storage.cacheRequestAdd(hash, rs);
        }

        // Rs
        return rs;
      } catch (e) {
        console.log(`>>> REQUEST FAIL / TRY ${rTry} /  SLEEP 5sec. <<<`);
        console.error(e);
        await Tools.sleep(5000);
      }
    }
  }

  /**
   * Request to get all filters data (main activities, revenue, etc.)
   */
  async getFiltersData() {
    // Get main activities list
    return await this.request('app/search/filter-limits/?country=bg', {
      cache: true,
      tryToRefreshToken: true,
      data: null,
      method: 'GET',
    });
  }
}
