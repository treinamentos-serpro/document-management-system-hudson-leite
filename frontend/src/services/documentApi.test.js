import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadDocument, listDocuments, uploadDocument } from './documentApi.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('documentApi', () => {
  it('lista documentos via /api e identifica o usuário', async () => {
    const documents = [{ id: 'doc-1', originalName: 'guia.pdf' }];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ documents }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listDocuments('ana')).resolves.toEqual(documents);
    expect(fetchMock).toHaveBeenCalledWith('/api/documents', {
      headers: { 'X-User-Id': 'ana' },
    });
  });

  it('envia o arquivo como multipart sem definir Content-Type manualmente', async () => {
    const createdDocument = { id: 'doc-2', originalName: 'notas.txt' };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(createdDocument), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['texto'], 'notas.txt', { type: 'text/plain' });

    await expect(uploadDocument(file, 'ana')).resolves.toEqual(createdDocument);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/upload');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'X-User-Id': 'ana' });
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file').name).toBe('notas.txt');
  });

  it('baixa o binário e transforma erros da API em mensagens legíveis', async () => {
    const file = new Blob(['conteúdo']);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(file, { status: 200 }))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { message: 'Arquivo excede o limite.' } }),
        { status: 413, headers: { 'Content-Type': 'application/json' } },
      ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadDocument('doc/3', 'ana')).resolves.toBeInstanceOf(Blob);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/documents/doc%2F3/download');
    await expect(listDocuments('ana')).rejects.toThrow('Arquivo excede o limite.');
  });
});