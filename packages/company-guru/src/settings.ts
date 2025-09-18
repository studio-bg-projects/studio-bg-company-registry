import moment from 'moment';

export const guruSettings = {
  requestSleepMs: 130, // ~ 1000 / users

  dateChunks: [
    [moment('1800-01-01'), moment('1990-01-01')],
    [moment('1990-01-01'), moment('2000-01-01')],
    [moment('2000-01-01'), moment('2005-01-01')],
    [moment('2005-01-01'), moment('2006-01-01')],
    [moment('2006-01-01'), moment('2007-01-01')],
    [moment('2007-01-01'), moment('2008-01-01')],
    [moment('2008-01-01'), moment('2009-01-01')],
    [moment('2009-01-01'), moment('2010-01-01')],
    [moment('2010-01-01'), moment('2020-01-01')],
    [moment('2020-01-01'), moment('2021-12-01')],
    [moment('2021-12-01'), moment('2022-06-01')],
    [moment('2022-06-01'), moment('2022-12-01')],
    [moment('2022-12-01'), moment('2023-06-01')],
    [moment('2023-06-01'), moment('2023-12-01')],
    [moment('2023-12-01'), moment()],
  ],

  users: [
    {
      email: 'alex@atlantify.com',
      password: 'alexander87',
    },
    {
      email: 'cg1@afy.li',
      password: 'alexander87',
    },
    {
      email: 'aleer@afy.li',
      password: 'alexander87',
    },
    {
      email: 'test@afy.li',
      password: 'alexander87',
    },
    {
      email: 'asasdasdsadsa@afy.li',
      password: 'alexander87',
    },
    {
      email: 'info@atlantify.com',
      password: 'alexander87',
    },
    {
      email: 'office@studio.bg',
      password: 'alexander87',
    },
    {
      email: 'i.petrov2000@abv.bg',
      password: 'alexander87',
    },
  ],
};
