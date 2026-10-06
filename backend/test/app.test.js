const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(storageDir, { recursive: true, force: true });
});

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('envia, lista e baixa um documento do proprietário', async () => {
  const form = new FormData();
  form.append('file', new Blob(['conteudo do documento']), 'documento.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-1' },
    body: form,
  });

  assert.equal(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.ok(document.id);
  assert.equal(document.originalName, 'documento.txt');
  assert.equal(document.size, 21);
  assert.equal(document.owner, 'usuario-1');
  assert.ok(document.uploadedAt);
  assert.equal('storedName' in document, false);
  assert.equal(fs.readdirSync(storageDir).length, 1);

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const otherUserList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.deepEqual((await otherUserList.json()).documents, []);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-1' },
  });
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'conteudo do documento');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);

  const otherUserDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-2' },
  });
  assert.equal(otherUserDownload.status, 404);
});

test('exige identificador de usuário para listar documentos', async () => {
  const response = await fetch(`${baseUrl}/documents`);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'USER_REQUIRED');
});
