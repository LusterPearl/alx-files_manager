const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb'); // Add this line
const dbClient = require('../utils/db'); // Modify this line
const redisClient = require('../utils/redis'); // Modify this line
const { getUserFromToken } = require('../utils/auth');

class FilesController {
  static async postUpload(req, res) {
    const db = await dbClient.db; // Correct the way to get the DB
    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    
    // Retrieve user from token
    const user = await getUserFromToken(req.headers['x-token']);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Check parentId
    if (parentId !== 0) {
      const parentFile = await db.collection('files').findOne({ _id: ObjectId(parentId) }); // Add ObjectId conversion
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create file/folder document
    const fileDocument = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectId(parentId), // Add ObjectId conversion
    };

    if (type === 'folder') {
      await db.collection('files').insertOne(fileDocument);
      return res.status(201).json(fileDocument);
    }

    // Save file data
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const localPath = path.join(folderPath, uuidv4());
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(localPath, buffer);

    fileDocument.localPath = localPath;
    await db.collection('files').insertOne(fileDocument);

    res.status(201).json(fileDocument);
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) return res.status(404).json({ error: 'Not found' });

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) }); // Ensure ObjectId conversion
    if (!file) return res.status(404).json({ error: 'Not found' });

    res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page) || 0;

    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: { userId: ObjectId(userId), parentId: parentId === 0 ? 0 : ObjectId(parentId) } },
        { $skip: page * 20 },
        { $limit: 20 }
      ]).toArray();

    res.status(200).json(files);
  }
}

module.exports = FilesController;
