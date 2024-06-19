// Filescontroller
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import Queue from 'bull';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;
    if (parentId !== 0) {
      parentFile = await dbClient.db.collection('files').findOne({ _id: new dbClient.ObjectID(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId: new dbClient.ObjectID(userId),
      name,
      type,
      isPublic,
      parentId: parentId !== 0 ? new dbClient.ObjectID(parentId) : 0,
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        ...fileDocument,
      });
    }

    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    await fs.mkdir(FOLDER_PATH, { recursive: true });
    const fileUUID = uuidv4();
    const fileExtension = mime.extension(type);
    const localPath = path.join(FOLDER_PATH, `${fileUUID}.${fileExtension}`);
    await fs.writeFile(localPath, Buffer.from(data, 'base64'));

    fileDocument.localPath = localPath;
    const result = await dbClient.db.collection('files').insertOne(fileDocument);

    // Add job to queue
    if (type === 'image') {
      await fileQueue.add({
        userId,
        fileId: result.insertedId,
      });
    }

    return res.status(201).json({
      id: result.insertedId,
      ...fileDocument,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: new dbClient.ObjectID(fileId), userId: new dbClient.ObjectID(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId ? new dbClient.ObjectID(req.query.parentId) : 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;

    const files = await dbClient.db.collection('files')
      .find({ userId: new dbClient.ObjectID(userId), parentId })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    let file;
    try {
      file = await dbClient.db.collection('files').findOne({ _id: new dbClient.ObjectID(fileId), userId: new dbClient.ObjectID(userId) });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne({ _id: file._id }, { $set: { isPublic: true } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: file._id });

    return res.status(200).json(updatedFile);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    let file;
    try {
      file = await dbClient.db.collection('files').findOne({ _id: new dbClient.ObjectID(fileId), userId: new dbClient.ObjectID(userId) });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne({ _id: file._id }, { $set: { isPublic: false } });

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: file._id });

    return res.status(200).json(updatedFile);
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;
    const { size } = req.query;

    let file;
    try {
      file = await dbClient.db.collection('files').findOne({ _id: new dbClient.ObjectID(fileId) });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!file.isPublic) {
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId || userId !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    let filePath = file.localPath;
    if (size && ['500', '250', '100'].includes(size)) {
      filePath = `${file.localPath}_${size}`;
    }

    try {
      const fileData = await fs.readFile(filePath);
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      return res.status(200).send(fileData);
    } catch (error) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;