// controllers/UsersController.js
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const encrypt = require('crypto');

class UsersController {
  async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const users = dbClient.db.collection('users');
    if (!users) {
      return res.status(500).json({ error: 'Database connection not initialized' });
    }

    const user = await users.findOne({ email });
    if (user) return res.status(400).json({ error: 'Already exist' });

    const hashedpw = encrypt.createHash('SHA1').update(password).digest('hex');
    const userObj = await users.insertOne({ email, password: hashedpw });
    const newUser = { id: userObj.insertedId, email };
    res.status(201).json(newUser);
  }

  async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: new dbClient.ObjectID(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = new UsersController();