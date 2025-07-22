import React, { useState } from 'react';

function Section({ title, children }) {
  return (
    <div className="section">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

function getDefaultValue(schema) {
  if (!schema) return undefined;
  if (schema.default !== undefined) return schema.default;
  if (schema.example !== undefined) return schema.example;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  switch (schema.type) {
    case 'string': return '';
    case 'number':
    case 'integer': return 0;
    case 'boolean': return false;
    case 'array': return [];
    case 'object': {
      const obj = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([k, v]) => {
          obj[k] = getDefaultValue(v);
        });
      }
      return obj;
    }
    default: return undefined;
  }
}

function buildCurl({ method, path, op, server }) {
  // Reemplazo {param} por :param para compatibilidad Insomnia/Postman
  let url = '';
  if (server) {
    url = server.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  } else {
    url = path;
  }
  url = url.replace(/\{([^}]+)\}/g, ':$1');
  let curl = `curl -X ${method.toUpperCase()} \\
  '${url}' \\`;
  let headers = [];
  if (op.requestBody) {
    headers.push('Content-Type: application/json');
  }
  headers.push('Authorization: Bearer <token>');
  headers.forEach(h => {
    curl += `\n  -H '${h}' \\`;
  });
  if (op.requestBody && op.requestBody.content && op.requestBody.content['application/json']) {
    let example = '{}';
    const schema = op.requestBody.content['application/json'].schema;
    if (schema) {
      const obj = getDefaultValue(schema);
      if (obj !== undefined && obj !== null) {
        example = JSON.stringify(obj, null, 2);
      }
    }
    curl += `\n  -d '${example.replace(/'/g, "'\''")}'`;
  }
  return curl;
}

function groupEndpointsByTagOrPath(paths) {
  const groups = {};
  Object.entries(paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, op]) => {
      let tags = op.tags && op.tags.length > 0 ? op.tags : null;
      if (!tags) {
        // Agrupa por primer segmento de path si no hay tags
        const match = path.match(/^\/([^\/]+)/);
        tags = [match ? match[1] : 'default'];
      }
      tags.forEach(tag => {
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push({ path, method, op });
      });
    });
  });
  return groups;
}

export default function OpenApiViewer({ openApi }) {
  const info = openApi.info || {};
  const paths = openApi.paths || {};
  const components = openApi.components || {};
  const server = openApi.servers && openApi.servers.length > 0 ? openApi.servers[0].url : '';
  const [copied, setCopied] = useState(null);
  const [openGroups, setOpenGroups] = useState(() => {
    const groups = groupEndpointsByTagOrPath(paths);
    const state = {};
    Object.keys(groups).forEach(tag => { state[tag] = false; }); // colapsados por defecto
    return state;
  });

  const handleCopy = (curl, id) => {
    navigator.clipboard.writeText(curl);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  };

  const groups = groupEndpointsByTagOrPath(paths);

  return (
    <div className="openapi-viewer">
      <Section title={info.title || 'API Untitled'}>
        <div className="api-meta">
          <span><b>Version:</b> {info.version || 'N/A'}</span>
          {server && <span><b>Server:</b> {server}</span>}
        </div>
      </Section>

      <Section title="Endpoints">
        {Object.keys(groups).length === 0 && <div>No endpoints found.</div>}
        <div className="endpoints-list">
          {Object.entries(groups).map(([tag, endpoints]) => (
            <div key={tag} className="endpoint-group">
              <div
                className="endpoint-group-header"
                style={{display:'flex',alignItems:'center',cursor:'pointer',userSelect:'none',marginBottom:openGroups[tag]?8:0}}
                onClick={() => setOpenGroups(g => ({...g, [tag]: !g[tag]}))}
              >
                <span style={{fontWeight:'bold',fontSize:'1.15em',color:'#b58900',marginRight:8}}>{tag}</span>
                <svg style={{transform:openGroups[tag]?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.15s'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2aa198" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                <span style={{color:'#586e75',fontSize:'0.95em',marginLeft:8}}>{endpoints.length} endpoints</span>
              </div>
              {openGroups[tag] && endpoints.map(({path, method, op}, idx) => {
                const curl = buildCurl({ method, path, op, server });
                const id = `${method}-${path}`;
                return (
                  <div key={method+path+idx} className="endpoint-path">
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="endpoint-title" style={{flex:1}}>{path}</div>
                      <button
                        className="copy-curl-btn"
                        title="Copy curl command"
                        aria-label="Copy curl command"
                        onClick={() => handleCopy(curl, id)}
                        style={{background:'none', border:'none', cursor:'pointer', marginLeft:8, marginRight:8, position:'relative', top:2}}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b58900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                        {copied === id && <span className="copied-tooltip" style={{left:'-70px',top:'-2px'}}>Copied!</span>}
                      </button>
                    </div>
                    <div className={`endpoint-method method-${method}`} style={{position:'relative'}}>
                      <span className="method-badge">{method.toUpperCase()}</span>
                      <span className="endpoint-summary">{op.summary || op.operationId || 'No summary'}</span>
                      <span style={{display:'block',marginTop:4}}></span>
                      {op.description && <div className="endpoint-desc">{op.description}</div>}
                      {op.parameters && op.parameters.length > 0 && (
                        <div className="endpoint-params">
                          <b>Parameters:</b>
                          <ul>
                            {op.parameters.map(param => (
                              <li key={param.name}>
                                <b>{param.name}</b> <i>({param.in})</i>
                                {param.required && <span className="required"> mandatory</span>}
                                {param.description && <>: {param.description}</>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {op.requestBody && (
                        <div className="endpoint-body">
                          <b>Body:</b> {op.requestBody.description || 'No description'}
                        </div>
                      )}
                      {op.responses && (
                        <div className="endpoint-responses">
                          <b>Responses:</b>
                          <ul>
                            {Object.entries(op.responses).map(([code, resp]) => (
                              <li key={code}>
                                <b>{code}</b>: {resp.description || 'No description'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Section>

      {components.schemas && (
        <Section title="Schemas">
          <div className="schemas-list">
            {Object.entries(components.schemas).map(([name, schema]) => (
              <div key={name} className="schema-block">
                <div className="schema-title">{name}</div>
                <pre className="schema-json">{JSON.stringify(schema, null, 2)}</pre>
              </div>
            ))}
          </div>
        </Section>
      )}
      <style>{`
        .copy-curl-btn svg { transition: transform 0.1s; }
        .copy-curl-btn:active svg { transform: scale(0.92); }
        .copied-tooltip {
          position: absolute;
          right: unset;
          left: -70px;
          top: -2px;
          background: #2aa198;
          color: #002b36;
          border-radius: 6px;
          padding: 2px 10px;
          font-size: 0.98em;
          font-weight: bold;
          box-shadow: 0 2px 8px #002b3622;
          z-index: 10;
          pointer-events: none;
          opacity: 0.95;
        }
        .endpoint-group {
          margin-bottom: 32px;
          background: #002b36;
          border-radius: 10px;
          box-shadow: 0 2px 8px #002b3699;
          padding: 0 0 8px 0;
        }
        .endpoint-group-header {
          padding: 16px 24px 8px 24px;
          border-radius: 10px 10px 0 0;
          background: #073642;
        }
      `}</style>
    </div>
  );
} 