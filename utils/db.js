// utils/db.js
const { MongoClient, ObjectId } = require('mongodb');
const sha1 = require('sha1');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const uri = `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    this.client.connect().then(() => {
      this.db = this.client.db(DB_DATABASE);
      console.log('MongoDB connected successfully');
    }).catch((err) => {
      console.error('MongoDB Client Error:', err);
    });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async createUser(email, password) {
    const userExists = await this.db.collection('users').findOne({ email });

    if (userExists) {
      throw new Error('User already exists');
    }

    const hashedPassword = sha1(password);

    const result = await this.db.collection('users').insertOne({ email, password: hashedPassword });
    return { id: result.insertedId, email };
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
