// utils/redis.js
const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.log(err);
      this.connected = false;
    });
    this.connected = true;
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    const getPromise = promisify(this.client.get).bind(this.client);
    return getPromise(key);
  }

  async set(key, value, duration) {
    const setPromise = promisify(this.client.set).bind(this.client);
    return setPromise(key, value, 'EX', duration);
  }

  async del(key) {
    const delPromise = promisify(this.client.del).bind(this.client);
    return delPromise(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
