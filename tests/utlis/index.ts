import { BrowserContext, Route } from '@playwright/test';
import { mockVersions } from './mocks/compiler';

export type RouteFulfill = Parameters<Route['fulfill']>[0];

export function refuseExternalUrls(context: BrowserContext, baseURL: string) {
  const host = new URL(baseURL).host;
  return context.route(
    (url) => url.host !== host,
    (route) => route.abort('connectionrefused'),
  );
}

export function prepareNetwork(context: BrowserContext, baseURL: string) {
  return Promise.all([
    refuseExternalUrls(context, baseURL),
    mockVersions(context),
  ]);
}

export function toPostData(code: string) {
  return code.replace(/\n/g, '\\n').replace(/"/g, '\\"');
}
