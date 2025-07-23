import React, { useState, useEffect } from 'react';
import OpenApiViewer from './components/OpenApiViewer';

function getSavedApis() {
  // Devuelve un array de {key, name, date, json}
  const items = [];
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('openapi_')) {
      try {
        const obj = JSON.parse(localStorage.getItem(k));
        items.push({ key: k, ...obj });
      } catch {}
    }
  });
  // Más recientes primero
  return items.sort((a, b) => b.date - a.date);
}

function saveApiJson(json) {
  const name = (json.info && json.info.title) ? json.info.title : 'API';
  const key = 'openapi_' + name.replace(/\s+/g, '_').toLowerCase();
  const data = { name, date: Date.now(), json };
  localStorage.setItem(key, JSON.stringify(data));
}

function downloadJson(name, json) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.replace(/\s+/g, '_') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function App() {
  const [openApiJson, setOpenApiJson] = useState(null);
  const [error, setError] = useState('');
  const [raw, setRaw] = useState('');
  const [savedApis, setSavedApis] = useState([]);

  useEffect(() => {
    setSavedApis(getSavedApis());
  }, []);

  const handleLoad = () => {
    setError('');
    try {
      const json = JSON.parse(raw);
      setOpenApiJson(json);
      saveApiJson(json);
      setSavedApis(getSavedApis());
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
      setOpenApiJson(null);
    }
  };

  const handleSelectSaved = (api) => {
    setOpenApiJson(api.json);
    setRaw(JSON.stringify(api.json, null, 2));
  };

  const handleDeleteSaved = (key) => {
    localStorage.removeItem(key);
    setSavedApis(getSavedApis());
    // Si el que estaba cargado es el que se borra, lo quitamos
    if (openApiJson && ('openapi_' + (openApiJson.info?.title || 'API').replace(/\s+/g, '_').toLowerCase()) === key) {
      setOpenApiJson(null);
      setRaw('');
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
      <section className="saved-apis-section">
        {savedApis.length > 0 && (
          <div className="saved-apis-list">
            <h2 style={{color:'#b58900',marginBottom:8}}>Saved APIs</h2>
            <ul style={{listStyle:'none',padding:0}}>
              {savedApis.map(api => (
                <li key={api.key} style={{display:'flex',alignItems:'center',gap:12,background:'#073642',borderRadius:8,padding:'8px 12px',marginBottom:8}}>
                  <span style={{flex:1,fontWeight:'bold',color:'#2aa198'}}>{api.name}</span>
                  <span style={{color:'#93a1a1',fontSize:'0.95em'}}>{new Date(api.date).toLocaleString()}</span>
                  <button onClick={() => handleSelectSaved(api)} style={{background:'#2aa198',color:'#002b36',border:'none',borderRadius:6,padding:'4px 10px',fontWeight:'bold',cursor:'pointer'}}>Load</button>
                  <button onClick={() => downloadJson(api.name, api.json)} style={{background:'none',color:'#b58900',border:'1px solid #b58900',borderRadius:6,padding:'4px 10px',fontWeight:'bold',cursor:'pointer'}}>Download</button>
                  <button onClick={() => handleDeleteSaved(api.key)} style={{background:'none',color:'#dc322f',border:'1px solid #dc322f',borderRadius:6,padding:'4px 10px',fontWeight:'bold',cursor:'pointer'}}>Delete</button>
                </li>
              ))}
            </ul>
          </div>
        )}
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