// utils/db.js
import { MongoClient, ObjectID } from 'mongodb';
import EventEmitter from 'events';

class DBClient extends EventEmitter {
  constructor() {
    super();
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const dbName = process.env.DB_DATABASE || 'files_manager';

    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.client.connect().then((client) => {
      this.db = client.db(dbName);
      this.usersCollection = this.db.collection('users');
      this.emit('connected');
    }).catch((err) => {
      console.error(err);
    });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.usersCollection.countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  ObjectID(id) {
    return new ObjectID(id);
  }
}

const dbClient = new DBClient();
export default dbClient;