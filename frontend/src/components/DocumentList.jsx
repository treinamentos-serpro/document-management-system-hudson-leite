import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, userId, isLoading, error, onRetry }) {
  return (
    <section className="documents-section" aria-labelledby="documents-heading">
      <div className="section-heading list-heading">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2 id="documents-heading">Seus documentos</h2>
        </div>
        <span className="document-count">{documents.length.toString().padStart(2, '0')}</span>
      </div>
      {isLoading ? (
        <p className="empty-state" role="status">Carregando documentos...</p>
      ) : error ? (
        <div className="empty-state error-state" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
        </div>
      ) : documents.length === 0 ? (
        <p className="empty-state">Ainda não há documentos nesta conta.</p>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <div className="document-details">
                <span className="document-name">{document.originalName}</span>
                <span className="document-meta">
                  {formatFileSize(document.size)} <span aria-hidden="true">·</span> {formatDate(document.uploadedAt)}
                </span>
              </div>
              <DownloadButton document={document} userId={userId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}