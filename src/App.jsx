import React, { useState } from 'react';
import OpenApiViewer from './components/OpenApiViewer';

export default function App() {
  const [openApiJson, setOpenApiJson] = useState(null);
  const [error, setError] = useState('');
  const [raw, setRaw] = useState('');

  const handleLoad = () => {
    setError('');
    try {
      const json = JSON.parse(raw);
      setOpenApiJson(json);
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
      setOpenApiJson(null);
    }
  };

  return (
    <div className="solarized-app">
      <header>
        <h1>🚀 ClearApi <span className="subtitle">Solarized Dark</span></h1>
        <p>Paste your OpenAPI JSON below and explore your API in a clear and elegant way.</p>
      </header>
      <section className="input-section">
        <textarea
          className="json-input"
          placeholder="Paste your OpenAPI JSON here..."
          value={raw}
          onChange={e => setRaw(e.target.value)}
          rows={12}
        />
        <button className="load-btn" onClick={handleLoad}>Load API</button>
        {error && <div className="error-msg">{error}</div>}
      </section>
      <section>
        {openApiJson && <OpenApiViewer openApi={openApiJson} />}
      </section>
      <footer>
        <span>Solarized Dark — ClearApi</span>
      </footer>
    </div>
  );
} 