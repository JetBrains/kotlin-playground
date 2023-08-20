import { BrowserContext, Route } from '@playwright/test';
import { mockVersions } from './mocks/compiler';

export type RouteFulfill = Parameters<Route['fulfill']>[0];

export async function refuseExternalUrls(
  context: BrowserContext,
  baseURL: string,
) {
  const host = new URL(baseURL).host;

  const checkUrl = (url: URL) => url.host && url.host !== host;
  const onMatch = (route: Route) => route.abort('connectionrefused');

  await context.route(checkUrl, onMatch);
  return () => context.unroute(checkUrl, onMatch);
}

export async function prepareNetwork(context: BrowserContext, baseURL: string) {
  const unRefuse = await refuseExternalUrls(context, baseURL);
  const unVersions = await mockVersions(context);

  return async () => {
    await unVersions();
    await unRefuse();
  };
}

export function toPostData(code: string) {
  return code.replace(/\n/g, '\\n').replace(/"/g, '\\"');
}
