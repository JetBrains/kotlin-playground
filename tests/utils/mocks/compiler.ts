import { BrowserContext, Route, Request, Page } from '@playwright/test';
import { join } from 'path';
import { RouteFulfill } from '../index';

export const API_HOST = 'api.kotlinlang.org' as const;
export const CDN_HOST = 'cdn.jsdelivr.net' as const;

function defaultVersions(route: Route, req: Request) {
  if (req.method() !== 'GET') {
    return route.continue();
  }

  return route.fulfill({ path: join(__dirname, 'versions.json') });
}

export async function mockVersions(
  page: Page | BrowserContext,
  resp?: Parameters<Page['route']>[1] | Parameters<BrowserContext['route']>[1],
) {
  const checkUrl = (url: URL) =>
    url.host === API_HOST && url.pathname.match(/^\/?\/versions$/) !== null;
  const onMatch = resp || defaultVersions;

  await page.route(checkUrl, onMatch);

  return () => page.unroute(checkUrl, onMatch);
}

function isRunRequest(url: URL | string) {
  const uri = url instanceof URL ? url : new URL(url);

  return (
    uri.host === API_HOST &&
    (uri.pathname.match(
      /^\/?\/api\/\d+\.\d+\.\d+(-[a-z]+.\d+)?\/compiler\/run$/,
    ) !== null ||
      uri.pathname.match(
        /^\/?\/api\/\d+\.\d+\.\d+(-[a-z]+.\d+)?\/compiler\/translate$/,
      ) !== null)
  );
}

export async function mockRunRequest(page: Page | BrowserContext) {
  let resolve: (value?: RouteFulfill) => void;

  const promise = new Promise<RouteFulfill>((cb) => {
    resolve = cb;
  });

  const checkUrl = (url: URL) => isRunRequest(url);
  const onMatch = (route: Route) =>
    route.request().method() !== 'POST'
      ? route.continue()
      : promise.then((value) => route.fulfill(value));

  await page.route(checkUrl, onMatch);

  return (value: RouteFulfill) => {
    resolve(value);
    page.unroute(checkUrl, onMatch);
  };
}

export async function waitRunRequest(page: Page) {
  return page.waitForRequest(
    (req) => req.method() === 'POST' && isRunRequest(req.url()),
  );
}

function kotlinJSAsset(route: Route, req: Request) {
  if (req.method() !== 'GET') {
    return route.continue();
  }

  return route.fulfill({ path: join(__dirname, 'kotlin.js') });
}

function jqAsset(route: Route, req: Request) {
  if (req.method() !== 'GET') {
    return route.continue();
  }

  return route.fulfill({ path: join(__dirname, 'jquery.min.js') });
}

export async function mockJsLegacyAssets(page: Page | BrowserContext) {
  const checkKotlinUrl = (url: URL) =>
    url.host === CDN_HOST &&
    url.pathname.match(/^\/?npm\/kotlin@\d+.\d+.\d+\/kotlin\.js$/) !== null;

  const checkJQUrl = (url: URL) =>
    url.host === CDN_HOST &&
    url.pathname.match(/^\/?npm\/jquery@1\/dist\/jquery\.min\.js$/) !== null;

  await Promise.all([
    page.route(checkKotlinUrl, kotlinJSAsset),
    page.route(checkJQUrl, jqAsset),
  ]);

  return () => page.unroute(checkKotlinUrl, kotlinJSAsset);
}
