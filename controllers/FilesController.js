// controllers/FilesController.js
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const fs = require('fs');
const path = require('path');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(req, res) {
    const db = dbClient.db;
    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    // Retrieve user from token
    const token = req.headers['x-token'];
    const user = await redisClient.get(`auth_${token}`);
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
      const parentFile = await db.collection('files').findOne({ _id: parentId });
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
      parentId: parentId === 0 ? 0 : parentId,
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

  static async getFile(req, res) {
    const db = dbClient.db;
    const { id } = req.params;
    const { userId } = req.query;

    // Retrieve user from token
    const token = req.headers['x-token'];
    const user = await redisClient.get(`auth_${token}`);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate file ID
    if (!id) {
      return res.status(400).json({ error: 'Missing file ID' });
    }

    // Fetch file from database
    const file = await db.collection('files').findOne({ _id: dbClient.getObjectId(id) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Check file type
    if (file.type === 'folder') {
      return res.status(400).json({ error: 'Cannot get content of a folder' });
    }

    // Check user authorization
    if (file.userId.toString() !== userId && !file.isPublic) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Read and return file content
    try {
      const fileContent = fs.readFileSync(file.localPath, 'utf-8');
      res.setHeader('Content-Type', mime.lookup(file.name) || 'application/octet-stream');
      return res.status(200).send(fileContent);
    } catch (err) {
      return res.status(500).json({ error: 'Error reading file' });
    }
  }
}

module.exports = FilesController;
