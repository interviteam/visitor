import * as process from 'process';
import { createServer, IncomingMessage } from 'http';
import type { State } from './visitor';

type AppCallback = (state: State) => Promise<string>
type RouteHandler = (request: IncomingMessage) => Promise<unknown>

const readableToString: (readable: IncomingMessage) => Promise<string> = (readable) => new Promise((resolve, reject) => {
  let data = '';
  readable.on('data', (chunk) => (data += chunk));
  readable.on('end', () => resolve(data));
  readable.on('error', (err) => reject(err));
});

export function startRenderingService(render: AppCallback, port: number = 2137): void {
  const routes: Record<string, RouteHandler> = {
    '/health': async () => ({ status: 'OK', timestamp: Date.now() }),
    '/shutdown': () => process.exit(),
    '/render': async (request) => render(JSON.parse(await readableToString(request))),
    '/404': async () => ({ status: 'NOT_FOUND', timestamp: Date.now() }),
  };

  createServer(async (request, response) => {
    const dispatchRoute = routes[<string>request.url] || routes['/404'];

    try {
      response.writeHead(200, { 'Content-Type': 'text/html', Server: 'InteractiveVision Visitor SSR' });
      response.write(await dispatchRoute(request));
    } catch (e) {
      console.error(e);
    }

    response.end();
  }).listen(port, () => {
    console.log('Rendering service started started.');
  });

  console.log(`Starting rendering service on port ${port}...`);
}
