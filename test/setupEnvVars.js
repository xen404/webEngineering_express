import { chance } from './jest-tuwien/chance.js';

process.env.ARTMART_BASE_URL = 'https://' + chance.domain({tld: 'test'});
process.env.BLING_API_KEY = 'ak_wes20a3_' + chance.nanoid();
