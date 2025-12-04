import { fetch } from 'whatwg-fetch';
import { RUNTIME_CONFIG } from '../config';

export const fetchWithInterceptor = async function(url, config = {}) {
  const onRequest = RUNTIME_CONFIG.interceptor?.onRequest;

  const request = {
    url,
    method: config.method || 'GET',
    headers: { ...config.headers },
    body: config.body,
  };

  const modified = typeof onRequest === 'function'
    ? await onRequest(request).catch(() => null) ?? request
    : request;

  return fetch(modified.url, {
    method: modified.method,
    headers: modified.headers,
    body: modified.body,
  });
};
