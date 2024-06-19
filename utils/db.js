// utils/db.js
const { MongoClient, ObjectId } = require('mongodb');
const sha1 = require('sha1');
const dotenv = require('dotenv');

dotenv.config();

const url = process.env.DB_URL;
const dbName = process.env.DB_NAME;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.client.connect((err) => {
      if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
      }
      this.db = this.client.db(dbName);
      console.log('Database connected');
    });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async createUser(email, password) {
    const hashedPassword = sha1(password);
    const user = await this.db.collection('users').insertOne({ email, password: hashedPassword });
    return { id: user.insertedId, email };
  }

  getObjectId(id) {
    return new ObjectId(id);
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
