// Wraps the Nitro-built Cloudflare Worker so we can also export
// Durable Object classes alongside the default fetch handler.
// Wrangler uses this file as the bundle entry (see wrangler.jsonc).
import handler from './.output/server/index.mjs';

export { RedirectLog } from './server/durable-objects/redirect-log.ts';
export default handler;
