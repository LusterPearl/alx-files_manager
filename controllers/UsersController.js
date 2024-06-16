// controllers/UsersController.js
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;
  
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
  
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }
  
      const newUser = await dbClient.createUser(email, password);
      return res.status(201).json(newUser);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}  

module.exports = UsersController;
