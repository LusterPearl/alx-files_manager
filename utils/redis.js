// utils/redis.js
import redis from 'redis';

class RedisClient {
    constructor() {
        this.client = redis.createClient();

        this.client.on('error', (err) => {
            console.error('Redis error:', err);
        });
    }

    isAlive() {
        return this.client.connected;
    }

    async get(key) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, reply) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        });
    }

    async set(key, value, duration) {
        this.client.set(key, value);
        this.client.expire(key, duration);
    }

    async del(key) {
        this.client.del(key);
    }
}

const redisClient = new RedisClient();

export default redisClient;
