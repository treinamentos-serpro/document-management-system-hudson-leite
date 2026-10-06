const documentService = require('../services/documentService');

function requireUser(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner) {
    return res.status(400).json({
      error: { code: 'USER_REQUIRED', message: 'O cabeçalho X-User-Id é obrigatório.' },
    });
  }

  req.userId = owner;
  return next();
}

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'INVALID_UPLOAD', message: 'Envie um arquivo no campo file.' },
    });
  }

  const document = documentService.uploadDocument(req.file, req.userId);
  return res.status(201).json(document);
}

function list(req, res) {
  const documents = documentService.listDocuments(req.userId);
  return res.status(200).json({ documents });
}

async function download(req, res, next) {
  try {
    const result = await documentService.getDocumentDownload(req.params.id, req.userId);
    if (!result) {
      return res.status(404).json({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
      });
    }

    return res.download(result.filePath, result.document.originalName, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { download, list, requireUser, upload };