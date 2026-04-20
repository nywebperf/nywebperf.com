// Minimal worker entry used only for Vitest. Re-exports the Durable Object
// class so the test runtime can instantiate it; the default fetch handler is
// unused.
export { RedirectLog } from '../server/durable-objects/redirect-log';

export default {
    async fetch(): Promise<Response> {
        return new Response('test-only worker', { status: 200 });
    },
};
