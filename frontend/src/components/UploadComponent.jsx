import { useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.file.files[0];
    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    setError('');
    setSuccess('');
    setIsUploading(true);
    try {
      const document = await uploadDocument(file, userId);
      setSuccess(`${document.originalName} enviado.`);
      form.reset();
      onUploaded();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Adicionar</p>
          <h2 id="upload-heading">Enviar documento</h2>
        </div>
        <span className="step-mark" aria-hidden="true">01</span>
      </div>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker">
          <span className="file-picker-title">Escolha um arquivo</span>
          <span className="file-picker-help">Selecione um documento do seu dispositivo</span>
          <input name="file" type="file" aria-label="Arquivo" required />
        </label>
        <button className="button button-primary" type="submit" disabled={isUploading || !userId.trim()}>
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
        </button>
      </form>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {success && <p className="form-message success-message" role="status">{success}</p>}
    </section>
  );
}