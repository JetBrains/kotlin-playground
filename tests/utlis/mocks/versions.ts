import {BrowserContext, Route, Request} from "@playwright/test";
import {join} from 'path';

function defaultVersions(route: Route, req: Request) {
    if (req.method() !== 'GET') {
        route.fallback();
        return;
    }

    return route.fulfill({ path: join(__dirname, 'versions.json') });
}

export function mockVersions(context: BrowserContext, resp?: Parameters<BrowserContext['route']>[1]) {
    return context.route(
        url => url.host === 'api.kotlinlang.org' && url.pathname.match(/^\/?\/versions$/) !== null,
        resp || defaultVersions
    );
}
