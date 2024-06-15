// utils/db.js
import { MongoClient } from 'mongodb';
import { promisify } from 'util';

// Promisify setTimeout
const timeout = promisify(setTimeout);

class DBClient {
    constructor() {
        // Get the connection parameters from environment variables or use defaults
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';

        // Create the MongoDB URI
        const uri = `mongodb://${host}:${port}`;

        // Create a MongoDB client
        this.client = new MongoClient(uri, { useUnifiedTopology: true });

        // Connect to the MongoDB server
        this.client.connect()
            .then(() => {
                this.db = this.client.db(database);
                console.log('Connected to MongoDB');
            })
            .catch((err) => {
                console.error('MongoDB connection error:', err);
            });
    }

    // Method to check if the connection is alive
    isAlive() {
        return this.client.isConnected();
    }

    // Asynchronous method to get the number of users
    async nbUsers() {
        const collection = this.db.collection('users');
        return collection.countDocuments();
    }

    // Asynchronous method to get the number of files
    async nbFiles() {
        const collection = this.db.collection('files');
        return collection.countDocuments();
    }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
export default dbClient;
