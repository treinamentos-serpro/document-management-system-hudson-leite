// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  downloadDocument: vi.fn(),
  listDocuments: vi.fn(),
  uploadDocument: vi.fn(),
}));

vi.mock('./services/documentApi.js', () => api);

import App from './App.jsx';

const savedDocument = {
  id: 'doc-1',
  originalName: 'manual.txt',
  size: 8,
  uploadedAt: '2026-10-06T12:00:00.000Z',
  owner: 'usuario-local',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  api.listDocuments.mockReset().mockResolvedValue([]);
  api.uploadDocument.mockReset().mockResolvedValue(savedDocument);
  api.downloadDocument.mockReset().mockResolvedValue(new Blob(['conteúdo']));
});

describe('aplicação DMS', () => {
  it('lista, envia e baixa um documento usando o usuário atual', async () => {
    api.listDocuments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([savedDocument]);
    const createObjectURL = vi.fn(() => 'blob:document');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);

    expect(await screen.findByText('Ainda não há documentos nesta conta.')).toBeTruthy();
    const file = new File(['conteúdo'], 'manual.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText('Arquivo');
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(fileInput.files[0]).toBe(file);
    fireEvent.submit(fileInput.closest('form'));

    expect(await screen.findByText('manual.txt')).toBeTruthy();
    expect(api.uploadDocument).toHaveBeenCalledWith(file, 'usuario-local');
    await waitFor(() => expect(api.listDocuments).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'Baixar manual.txt' }));
    await waitFor(() => expect(api.downloadDocument).toHaveBeenCalledWith('doc-1', 'usuario-local'));
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:document');
    expect(anchorClick).toHaveBeenCalled();
  });

  it('mostra erros de carregamento e permite tentar novamente', async () => {
    api.listDocuments
      .mockRejectedValueOnce(new Error('Serviço indisponível.'))
      .mockResolvedValueOnce([]);
    render(<App />);

    expect(await screen.findByText('Serviço indisponível.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Ainda não há documentos nesta conta.')).toBeTruthy();
    expect(api.listDocuments).toHaveBeenCalledTimes(2);
  });
});