import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState('usuario-local');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setDocuments([]);
    setIsLoading(true);
    setListError('');

    listDocuments(userId.trim())
      .then((items) => {
        if (isCurrent) setDocuments(items);
      })
      .catch((error) => {
        if (isCurrent) setListError(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [userId, refreshKey]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS<span className="brand-period">.</span></span>
        </a>
        <label className="user-field">
          <span>Conta</span>
          <input
            type="text"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            aria-label="Identificador do usuário"
            placeholder="Identificador do usuário"
          />
        </label>
      </header>
      <div className="workspace" id="top">
        <div className="page-intro">
          <div>
            <p className="eyebrow">Arquivo pessoal</p>
            <h1>Documentos</h1>
          </div>
          <p className="intro-note">Envie, organize e acesse seus arquivos.</p>
        </div>
        <UploadComponent
          userId={userId}
          onUploaded={() => setRefreshKey((current) => current + 1)}
        />
        <DocumentList
          documents={documents}
          userId={userId}
          isLoading={isLoading}
          error={listError}
          onRetry={() => setRefreshKey((current) => current + 1)}
        />
      </div>
    </main>
  );
}
