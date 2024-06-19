// App controller 
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  async getStatus(req, res) {
    const data = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).json(data);
  }

  async getStats(req, res) {
    const data = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    res.status(200).json(data);
  }
}

module.exports = new AppController();
