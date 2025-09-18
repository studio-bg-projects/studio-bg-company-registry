import dotenv from 'dotenv';

dotenv.config({
  path: __dirname + '/../../.env',
});

export const config = {
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE || '',
    username: process.env.MYSQL_USERNAME || '',
    password: process.env.MYSQL_PASSWORD || '',
  },

  cg: {
    requestSleepMs: 130, // ~ 1000 / users

    users: [
      {
        email: 'alex@atlantify.com',
        password: 'alexander87',
        token: null,
        refreshToken: null,
        tokenExpireAt: null,
      },
      {
        email: 'cg1@afy.li',
        password: 'alexander87',
        token: null,
        refreshToken: null,
        tokenExpireAt: null,
      },
      {
        email: 'aleer@afy.li',
        password: 'alexander87',
        token: null,
        refreshToken: null,
        tokenExpireAt: null,
      },
      {
        email: 'test@afy.li',
        password: 'alexander87',
        token: null,
      },
      {
        email: 'asasdasdsadsa@afy.li',
        password: 'alexander87',
        token: null,
        refreshToken: null,
        tokenExpireAt: null,
      },
      {
        email: 'info@atlantify.com',
        password: 'alexander87',
        token: null,
        refreshToken: null,
        tokenExpireAt: null,
      },
      {
        email: 'office@studio.bg',
        password: 'alexander87',
        token: null,
        refreshToken: null,
        tokenExpireAt: null,
      },
      {
        email: 'i.petrov2000@abv.bg',
        password: 'alexander87',
        token: null,
        refreshToken: null,
        tokenExpireAt: null,
      },
    ],
  },
};
