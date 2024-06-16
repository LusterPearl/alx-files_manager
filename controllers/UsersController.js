// user controller
const sha1 = require('sha1');
const User = require('../models/User');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ id: newUser._id, email: newUser.email });
  }
}

module.exports = UsersController;
