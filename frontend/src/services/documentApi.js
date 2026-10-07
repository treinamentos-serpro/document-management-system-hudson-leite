const API_PREFIX = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, options);
  if (!response.ok) {
    let message = `Falha na requisição (${response.status}).`;
    try {
      const body = await response.json();
      message = body.error?.message || message;
    } catch {
      // A resposta pode não conter JSON, por exemplo em falhas de proxy.
    }
    throw new Error(message);
  }
  return response;
}

function userHeaders(userId) {
  return { 'X-User-Id': userId };
}

export async function listDocuments(userId) {
  const response = await request('/documents', { headers: userHeaders(userId) });
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', {
    method: 'POST',
    headers: userHeaders(userId),
    body: formData,
  });
  return response.json();
}

export async function downloadDocument(id, userId) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, {
    headers: userHeaders(userId),
  });
  return response.blob();
}