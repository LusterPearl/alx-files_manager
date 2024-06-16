// utils/redis.js
const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.pingAsync = promisify(this.client.ping).bind(this.client);
  }

  async isAlive() {
    try {
      const response = await this.pingAsync();
      return response === 'PONG';
    } catch (err) {
      console.error('Error checking Redis connection:', err);
      return false;
    }
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          return reject(err);
        }
        resolve(value);
      });
    });
  }

  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(true);
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(true);
      });
    });
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
