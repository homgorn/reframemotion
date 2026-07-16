export function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', ...headers});
  res.end(body);
}

export function text(res, status, body, contentType = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(status, {'content-type': contentType, 'content-length': Buffer.byteLength(body), ...headers});
  res.end(body);
}

export async function readBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error(`Request body exceeds ${maxBytes} bytes`);
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function readJson(req, maxBytes) {
  const raw = await readBody(req, maxBytes);
  try { return raw ? JSON.parse(raw) : {}; }
  catch (error) {
    const wrapped = new Error(`Invalid JSON: ${error.message}`);
    wrapped.statusCode = 400;
    throw wrapped;
  }
}
