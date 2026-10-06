const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDir } = require('../config/storage');

const documents = new Map();

function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

function createDocument(document) {
  documents.set(document.id, document);
  return toPublicDocument(document);
}

function listDocumentsByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .map(toPublicDocument);
}

async function findDocumentFileByOwner(id, owner) {
  const document = documents.get(id);
  if (!document || document.owner !== owner) {
    return null;
  }

  const filePath = path.join(storageDir, document.storedName);
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  return { document: toPublicDocument(document), filePath };
}

module.exports = {
  createDocument,
  findDocumentFileByOwner,
  listDocumentsByOwner,
};