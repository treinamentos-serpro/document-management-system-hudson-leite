const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

function uploadDocument(file, owner) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storedName: file.filename,
  };

  return documentRepository.createDocument(document);
}

function listDocuments(owner) {
  return documentRepository.listDocumentsByOwner(owner);
}

function getDocumentDownload(id, owner) {
  return documentRepository.findDocumentFileByOwner(id, owner);
}

module.exports = { getDocumentDownload, listDocuments, uploadDocument };