import React from 'react';

function Section({ title, children }) {
  return (
    <div className="section">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

export default function OpenApiViewer({ openApi }) {
  const info = openApi.info || {};
  const paths = openApi.paths || {};
  const components = openApi.components || {};

  return (
    <div className="openapi-viewer">
      <Section title={info.title || 'API Untitled'}>
        <div className="api-meta">
          <span><b>Version:</b> {info.version || 'N/A'}</span>
          {openApi.servers && openApi.servers.length > 0 && (
            <span><b>Server:</b> {openApi.servers[0].url}</span>
          )}
        </div>
      </Section>

      <Section title="Endpoints">
        {Object.keys(paths).length === 0 && <div>No endpoints found.</div>}
        <div className="endpoints-list">
          {Object.entries(paths).map(([path, methods]) => (
            <div key={path} className="endpoint-path">
              <div className="endpoint-title">{path}</div>
              {Object.entries(methods).map(([method, op]) => (
                <div key={method} className={`endpoint-method method-${method}`}>
                  <span className="method-badge">{method.toUpperCase()}</span>
                  <span className="endpoint-summary">{op.summary || op.operationId || 'No summary'}</span>
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
              ))}
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
    </div>
  );
} 