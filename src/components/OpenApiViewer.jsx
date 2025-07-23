import React, { useState, useEffect } from 'react';

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

function resolveRef(ref, components) {
  if (!ref || !ref.startsWith('#/components/schemas/')) return null;
  const name = ref.replace('#/components/schemas/', '');
  return components.schemas && components.schemas[name] ? { name, schema: components.schemas[name] } : null;
}

function getResponseSchema(resp, components) {
  if (!resp || !resp.content || !resp.content['application/json']) return null;
  const schema = resp.content['application/json'].schema;
  if (!schema) return null;
  // $ref
  if (schema.$ref) return resolveRef(schema.$ref, components);
  // Array of $ref
  if (schema.type === 'array' && schema.items && schema.items.$ref) return resolveRef(schema.items.$ref, components);
  // Inline object with properties (even if type is missing)
  if ((schema.type === 'object' || schema.properties) && typeof schema.properties === 'object') {
    // Give it a synthetic name for modal context
    return { name: 'InlineResponse', schema };
  }
  return null;
}

function getMandatoryFromSchema(schema) {
  return schema && schema.required ? schema.required : [];
}

function SchemaViewer({ schema, mandatory, context, components }) {
  const [expanded, setExpanded] = useState({});
  if (!schema) return null;
  // Always show table if object with properties, even for inline response schemas
  if ((schema.type === 'object' || schema.properties) && typeof schema.properties === 'object') {
    const mand = mandatory || [];
    // Filter fields by context
    const filteredEntries = Object.entries(schema.properties).filter(([k, v]) => {
      if (context && context.toLowerCase().includes('request')) {
        // Exclude readOnly fields in request
        return !v.readOnly;
      } else if (context && context.toLowerCase().includes('response')) {
        // Exclude writeOnly fields in response
        return !v.writeOnly;
      }
      return true;
    });
    // Helper para saber si un campo es expandible
    function isExpandable(v) {
      if (v.$ref) return true;
      if (v.type === 'object' && v.properties) return true;
      if (v.type === 'array' && v.items && (v.items.$ref || v.items.type === 'object')) return true;
      return false;
    }
    // Helper para obtener el esquema hijo
    function getChildSchema(v) {
      if (v.$ref) {
        const resolved = resolveRef(v.$ref, components);
        return resolved ? resolved.schema : null;
      }
      if (v.type === 'array' && v.items) {
        if (v.items.$ref) {
          const resolved = resolveRef(v.items.$ref, components);
          return resolved ? resolved.schema : v.items;
        }
        if (v.items.type === 'object' && v.items.properties) return v.items;
      }
      if (v.type === 'object' && v.properties) return v;
      return null;
    }
    return (
      <div className="schema-viewer">
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:8}}>
          <thead>
            <tr style={{borderBottom:'1.5px solid #586e75'}}>
              <th style={{color:'#b58900',textAlign:'left',padding:'4px 8px'}}></th>
              <th style={{color:'#b58900',textAlign:'left',padding:'4px 8px'}}>Field</th>
              <th style={{color:'#2aa198',textAlign:'left',padding:'4px 8px'}}>Type</th>
              <th style={{color:'#93a1a1',textAlign:'left',padding:'4px 8px'}}>Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map(([k, v]) => {
              const expandable = isExpandable(v);
              const isOpen = expanded[k];
              return (
                <React.Fragment key={k}>
                  <tr style={{borderBottom:'1px solid #073642'}}>
                    <td style={{padding:'4px 0 4px 4px',width:28}}>
                      {expandable && (
                        <span
                          style={{cursor:'pointer',display:'inline-flex',alignItems:'center'}}
                          onClick={() => setExpanded(e => ({...e, [k]: !e[k]}))}
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                          tabIndex={0}
                        >
                          <svg style={{transform:isOpen?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.15s'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2aa198" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </span>
                      )}
                    </td>
                    <td style={{padding:'4px 8px',fontWeight:'bold',color: mand.includes(k) ? '#fdf6e3' : '#fdf6e3'}}>
                      {k} {mand.includes(k) && <span style={{color:'#dc322f',fontWeight:'bold',marginLeft:4}} title="Mandatory">*</span>}
                    </td>
                    <td style={{padding:'4px 8px',color:'#2aa198'}}>{v.type || (v.$ref ? 'object' : '')}</td>
                    <td style={{padding:'4px 8px',color:'#93a1a1'}}>{v.description || ''}</td>
                  </tr>
                  {expandable && isOpen && (
                    <tr>
                      <td></td>
                      <td colSpan={3} style={{padding:'0 0 0 16px',background:'#002b36'}}>
                        <SchemaViewer
                          schema={getChildSchema(v)}
                          mandatory={getMandatoryFromSchema(getChildSchema(v))}
                          context={context}
                          components={components}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {schema.description && <div style={{color:'#b58900',marginTop:8}}>{schema.description}</div>}
      </div>
    );
  }
  // Fallback: show as JSON
  return <pre style={{background:'#002b36',color:'#93a1a1',padding:12,borderRadius:8,overflowX:'auto'}}>{JSON.stringify(schema, null, 2)}</pre>;
}

function getAIPromptValue(schema) {
  if (!schema) return undefined;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  switch (schema.type) {
    case 'string': return 'string';
    case 'number':
    case 'integer': return 0;
    case 'boolean': return false;
    case 'array': return [];
    case 'object': {
      const obj = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([k, v]) => {
          obj[k] = getAIPromptValue(v);
        });
      }
      return obj;
    }
    default: return 'string';
  }
}

// Update SchemaModal to pass context
function SchemaModal({ schema, name, onClose, context, mandatory, components }) {
  const [copied, setCopied] = React.useState(false);
  // Generar ejemplo JSON filtrado según contexto y con valores tipo IA, recursivo
  function getFilteredAIPrompt(schema, context) {
    if (!schema) return undefined;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];
    switch (schema.type) {
      case 'string': return 'string';
      case 'number':
      case 'integer': return 0;
      case 'boolean': return false;
      case 'array': {
        if (schema.items) return [getFilteredAIPrompt(schema.items, context)];
        return [];
      }
      case 'object': {
        const obj = {};
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([k, v]) => {
            if (context && context.toLowerCase().includes('request')) {
              if (!v.readOnly) obj[k] = getFilteredAIPrompt(v, context);
            } else if (context && context.toLowerCase().includes('response')) {
              if (!v.writeOnly) obj[k] = getFilteredAIPrompt(v, context);
            } else {
              obj[k] = getFilteredAIPrompt(v, context);
            }
          });
        }
        return obj;
      }
      default: return 'string';
    }
  }
  const exampleJson = JSON.stringify(getFilteredAIPrompt(schema, context), null, 2);
  const handleCopyJson = () => {
    navigator.clipboard.writeText(exampleJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="schema-modal-overlay" onClick={onClose} tabIndex={-1}>
      <div className="schema-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="schema-modal-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span className="schema-modal-title">{context}{name ? `: ${name}` : ''}</span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button
              className="copy-json-btn"
              onClick={handleCopyJson}
              style={{background:'none',border:'none',color:'#b58900',borderRadius:6,padding:'2px',fontWeight:'bold',cursor:'pointer',marginRight:8,position:'relative',top:2}}
              title="Copy JSON"
              aria-label="Copy JSON"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b58900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              {copied && <span className="copied-tooltip" style={{left:'-70px',top:'-2px'}}>Copied!</span>}
            </button>
            <button className="schema-modal-close" onClick={onClose} aria-label="Close schema">×</button>
          </div>
        </div>
        <SchemaViewer schema={schema} mandatory={mandatory} context={context} components={components} />
      </div>
      <style>{`
        .schema-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,43,54,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center;
        }
        .schema-modal {
          background: #073642; color: #eee8d5; border-radius: 12px; max-width: 600px; width: 95vw; max-height: 90vh; overflow: auto; box-shadow: 0 8px 32px #002b36cc; padding: 24px 28px 18px 28px;
        }
        .schema-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .schema-modal-title { font-size: 1.2em; color: #b58900; }
        .schema-modal-close { background: none; border: none; color: #dc322f; font-size: 2em; cursor: pointer; line-height: 1; }
        .copy-json-btn:hover svg { filter: brightness(1.5); }
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
      `}</style>
    </div>
  );
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
    Object.keys(groups).forEach(tag => { state[tag] = false; });
    return state;
  });
  const [modalSchema, setModalSchema] = useState(null);
  const [modalContext, setModalContext] = useState('Schema');
  const [modalMandatory, setModalMandatory] = useState([]);

  // Nuevo: resetear openGroups cada vez que cambie openApi
  useEffect(() => {
    const groups = groupEndpointsByTagOrPath(paths);
    const state = {};
    Object.keys(groups).forEach(tag => { state[tag] = false; });
    setOpenGroups(state);
  }, [openApi]);

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
                // Detect schema refs for requestBody and responses
                let reqSchemaRef = null;
                let reqMandatory = [];
                if (op.requestBody && op.requestBody.content && op.requestBody.content['application/json'] && op.requestBody.content['application/json'].schema) {
                  const schema = op.requestBody.content['application/json'].schema;
                  if (schema.$ref) {
                    reqSchemaRef = schema.$ref;
                    const resolved = resolveRef(reqSchemaRef, components);
                    reqMandatory = getMandatoryFromSchema(resolved && resolved.schema);
                  } else if (schema.type === 'array' && schema.items && schema.items.$ref) {
                    reqSchemaRef = schema.items.$ref;
                    const resolved = resolveRef(reqSchemaRef, components);
                    reqMandatory = getMandatoryFromSchema(resolved && resolved.schema);
                  }
                }
                const resSchemaRefs = [];
                if (op.responses) {
                  Object.entries(op.responses).forEach(([code, resp]) => {
                    if (/^2\d\d$/.test(code)) {
                      const resolved = getResponseSchema(resp, components);
                      if (resolved) {
                        resSchemaRefs.push({ code, ...resolved, mandatory: getMandatoryFromSchema(resolved.schema) });
                      }
                    }
                  });
                }
                return (
                  <div key={method+path+idx} className="endpoint-path">
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="endpoint-title" style={{flex:1}}>{path}</div>
                      <button
                        className="copy-curl-btn"
                        title="Copy curl"
                        aria-label="Copy curl"
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
                        <details style={{marginTop:8,marginBottom:8}}>
                          <summary style={{color:'#b58900',fontWeight:'bold',cursor:'pointer'}}>Parameters</summary>
                          <table className="params-table" style={{width:'100%',marginTop:8,background:'#073642',borderRadius:6,boxShadow:'0 2px 8px #002b3622',borderCollapse:'separate',borderSpacing:0}}>
                            <thead>
                              <tr style={{background:'#002b36'}}>
                                <th style={{color:'#b58900',textAlign:'left',padding:'8px 10px',borderTopLeftRadius:6}}>Name</th>
                                <th style={{color:'#b58900',textAlign:'left',padding:'8px 10px',fontFamily:'monospace'}}>Type</th>
                                <th style={{color:'#b58900',textAlign:'left',padding:'8px 10px'}}>In</th>
                                <th style={{color:'#b58900',textAlign:'left',padding:'8px 10px',minWidth:160,maxWidth:320}}>Description</th>
                                <th style={{color:'#b58900',textAlign:'center',padding:'8px 10px',borderTopRightRadius:6,minWidth:60}}>Mandatory</th>
                              </tr>
                            </thead>
                            <tbody>
                              {op.parameters.map((param, idx) => (
                                <tr key={idx} style={{borderBottom:'1px solid #073642'}}>
                                  <td style={{padding:'8px 10px',fontWeight:'bold',textAlign:'left',verticalAlign:'top'}}>{param.name}</td>
                                  <td style={{padding:'8px 10px',fontFamily:'monospace',textAlign:'left',verticalAlign:'top'}}>{param.schema?.type || param.type || '-'}</td>
                                  <td style={{padding:'8px 10px',textAlign:'left',verticalAlign:'top'}}>{param.in}</td>
                                  <td style={{padding:'8px 10px',textAlign:'left',verticalAlign:'top',minWidth:160,maxWidth:320,wordBreak:'break-word'}}>{param.description || '-'}</td>
                                  <td style={{padding:'8px 10px',textAlign:'center',verticalAlign:'top',minWidth:60}}>
                                    {param.required ? <span style={{color:'#dc322f',fontWeight:'bold',display:'inline-block',width:'100%'}} title="Mandatory">*</span> : ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      )}
                      {op.requestBody && (
                        <div className="endpoint-body">
                          <b>Body:</b> {op.requestBody.description || 'No description'}
                          {reqSchemaRef && resolveRef(reqSchemaRef, components) && (
                            <button className="schema-link-btn" onClick={() => { setModalSchema(resolveRef(reqSchemaRef, components)); setModalContext('Request Body Schema'); setModalMandatory(reqMandatory); }} style={{marginLeft:12,background:'none',border:'none',color:'#2aa198',cursor:'pointer',fontWeight:'bold'}}>View request schema</button>
                          )}
                        </div>
                      )}
                      {op.responses && (
                        <div className="endpoint-responses">
                          <b>Responses:</b>
                          <ul>
                            {Object.entries(op.responses).map(([code, resp]) => {
                              const resSchema = resSchemaRefs.find(r => r.code === code);
                              return (
                                <li key={code}>
                                  <b>{code}</b>: {resp.description || 'No description'}
                                  {resSchema && resSchema.schema && (
                                    <button
                                      className="schema-link-btn"
                                      onClick={() => {
                                        // If the schema is inline, use the code as the name
                                        const schemaName = resSchema.name === 'InlineResponse' ? code : resSchema.name;
                                        setModalSchema({ ...resSchema, name: schemaName });
                                        setModalContext('Response Body Schema');
                                        setModalMandatory(resSchema.mandatory);
                                      }}
                                      style={{marginLeft:10,background:'none',border:'none',color:'#2aa198',cursor:'pointer',fontWeight:'bold'}}
                                    >
                                      View response schema
                                    </button>
                                  )}
                                </li>
                              );
                            })}
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

      {modalSchema && (
        <SchemaModal name={modalSchema.name} schema={modalSchema.schema} context={modalContext} mandatory={modalMandatory} onClose={() => setModalSchema(null)} components={components} />
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
        .schema-link-btn:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
} 