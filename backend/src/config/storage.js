const path = require('node:path');

const storageDir = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);

let maxFileSize;
if (process.env.MAX_FILE_SIZE) {
  maxFileSize = Number(process.env.MAX_FILE_SIZE);
  if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
    throw new Error('MAX_FILE_SIZE deve ser um inteiro positivo em bytes');
  }
}

module.exports = { maxFileSize, storageDir };