const http = require("http");
const fs = require("fs").promises;
const { join } = require("path");
const { getType } = require('mime');
const { decode } = require('querystring');

const port = 8000;

async function sendFile(res, pathname, cb = null) {
  let content = await fs.readFile(join(__dirname, pathname));
  if(cb) content = cb(content.toString('utf-8'));

  res.setHeader('content-type', getType(pathname));
  res.writeHead(200);

  res.end(content);
}

async function readJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', function (data) { body += data; });
    req.on('end', function () {
      try {
        resolve(decode(body));
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function requestListener(req, res) {
  try {
    let response = null;
    const path = new URL(req.url, `http://localhost:${port}`).pathname;

    if (req.method === 'GET' && path.startsWith('/blank.html'))
      response = '';

    if (req.method === 'POST' && path === '/playground.html') {
      const { script, body } = await readJSON(req);
      response = sendFile(res, './playground.html', content => content
          .replace(/ data-script-config/, script ? decodeURIComponent(script) : '')
          .replace(/<!-- content -->/, body ? decodeURIComponent(body) : ''));
    }

    if (req.method === 'GET' && path.startsWith('/dist/'))
      response = sendFile(res, '../../../' + path.substring(1));

    if (response) {
      await response;
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    res.writeHead(500);
    res.end('ERROR: ' + e.message);
  }
}

const server = http.createServer(requestListener);

process.on( 'SIGINT', function() {
  process.exit();
});

server.listen(port);
