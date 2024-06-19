// workerjs
import Queue from 'bull';
import { promises as fs } from 'fs';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    done(new Error('Missing fileId'));
    return;
  }

  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: new dbClient.ObjectID(fileId),
    userId: new dbClient.ObjectID(userId),
  });

  if (!file) {
    done(new Error('File not found'));
    return;
  }

  const sizes = [500, 250, 100];
  const originalFilePath = file.localPath;

  try {
    for (const size of sizes) {
      const thumbnail = await imageThumbnail(originalFilePath, { width: size });
      const thumbnailPath = `${originalFilePath}_${size}`;
      await fs.writeFile(thumbnailPath, thumbnail);
    }
    done();
  } catch (error) {
    done(new Error(`Thumbnail generation failed: ${error.message}`));
  }
});

fileQueue.on('completed', (job) => {
  console.log(`Job with id ${job.id} has been completed`);
});

fileQueue.on('failed', (job, err) => {
  console.log(`Job with id ${job.id} has failed with error ${err.message}`);
});