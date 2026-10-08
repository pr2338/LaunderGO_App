import { env } from '../config/env';

// Release builds must not log tokens, user IDs or payment data to the device log.
const noop = () => {};

export const logger = {
  log: env.enableLogging ? console.log.bind(console) : noop,
  warn: env.enableLogging ? console.warn.bind(console) : noop,
  error: console.error.bind(console),
};
