import { Page, Route } from '@playwright/test';
import { mockVersions } from './mocks/compiler';

export type RouteFulfill = Parameters<Route['fulfill']>[0];

export async function refuseExternalUrls(page: Page, baseURL: string) {
  const host = new URL(baseURL).host;

  const checkUrl = (url: URL) => url.host && url.host !== host;
  const onMatch = (route: Route) => route.abort('connectionrefused');

  await page.route(checkUrl, onMatch);
  return () => page.unroute(checkUrl, onMatch);
}

export async function prepareNetwork(page: Page, baseURL: string) {
  const unRefuse = await refuseExternalUrls(page, baseURL);
  const unVersions = await mockVersions(page);

  return async () => {
    await unVersions();
    await unRefuse();
  };
}

export function toPostData(code: string) {
  return code.replace(/\n/g, '\\n').replace(/"/g, '\\"');
}
