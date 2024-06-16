const sha1 = require('sha1');
const { getDB } = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const db = getDB();
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const newUser = { email, password: hashedPassword };
    const result = await db.collection('users').insertOne(newUser);

    res.status(201).json({ id: result.insertedId, email: newUser.email });
  }
}

module.exports = UsersController;
