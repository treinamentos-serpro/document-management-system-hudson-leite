const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const express = require('express');
const multer = require('multer');
const { maxFileSize, storageDir } = require('../config/storage');
const documentController = require('../controllers/documentController');

const router = express.Router();
const diskStorage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDir, { recursive: true }).then(
      () => callback(null, storageDir),
      callback,
    );
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  },
});
const upload = multer({
  storage: diskStorage,
  limits: maxFileSize ? { fileSize: maxFileSize } : undefined,
});

router.post(
  '/upload',
  documentController.requireUser,
  upload.single('file'),
  documentController.upload,
);
router.get('/documents', documentController.requireUser, documentController.list);
router.get(
  '/documents/:id/download',
  documentController.requireUser,
  documentController.download,
);

module.exports = router;