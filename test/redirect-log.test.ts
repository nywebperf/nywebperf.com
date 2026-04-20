/// <reference path="../node_modules/@cloudflare/vitest-pool-workers/types/cloudflare-test.d.ts" />
import { describe, it, expect } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import {
    initSchema,
    type RedirectLog,
    type RedirectLogEntry,
} from '../server/durable-objects/redirect-log';

type Env = { REDIRECT_LOG: DurableObjectNamespace<RedirectLog> };

function getStub(name: string) {
    const typed = env as unknown as Env;
    const id = typed.REDIRECT_LOG.idFromName(name);
    return typed.REDIRECT_LOG.get(id);
}

function schemaVersion(sql: SqlStorage): number {
    const [row] = [...sql.exec<{ value: string }>(
        "SELECT value FROM _schema_meta WHERE key = 'version'",
    )];
    return row ? Number(row.value) : 0;
}

const baseEntry: RedirectLogEntry = {
    timestamp: '2026-04-20T10:00:00.000Z',
    path: '/meetup',
    shortUrl: 'meetup',
    destinationUrl: 'https://www.meetup.com/web-performance-ny/',
    vars: {},
};

describe('RedirectLog', () => {
    it('initialises schema and bumps user_version to 2', async () => {
        const stub = getStub('init-fresh');
        // Force construction.
        await stub.log(baseEntry);

        await runInDurableObject(stub, async (_instance, state) => {
            const tables = [...state.storage.sql.exec<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
            )].map((r) => r.name);
            expect(tables).toEqual(expect.arrayContaining([
                'routes', 'redirects', 'variables', 'redirect_variables',
            ]));
            expect(schemaVersion(state.storage.sql)).toBe(2);
        });
    });

    it('logs a redirect with no captured vars', async () => {
        const stub = getStub('log-no-vars');
        await stub.log(baseEntry);

        await runInDurableObject(stub, async (_instance, state) => {
            const routes = [...state.storage.sql.exec<{ path: string; short_url: string; destination_url: string }>(
                'SELECT path, short_url, destination_url FROM routes',
            )];
            expect(routes).toEqual([{
                path: '/meetup',
                short_url: 'meetup',
                destination_url: 'https://www.meetup.com/web-performance-ny/',
            }]);
            const redirects = [...state.storage.sql.exec<{ timestamp: string; route_id: number }>(
                'SELECT timestamp, route_id FROM redirects',
            )];
            expect(redirects).toHaveLength(1);
            expect(redirects[0]!.timestamp).toBe(baseEntry.timestamp);
            expect(redirects[0]!.route_id).toBe(1);
        });
    });

    it('dedupes the routes table across repeated hits of the same URL', async () => {
        const stub = getStub('dedupe-routes');
        await stub.log(baseEntry);
        await stub.log({ ...baseEntry, timestamp: '2026-04-20T10:01:00.000Z' });
        await stub.log({ ...baseEntry, timestamp: '2026-04-20T10:02:00.000Z' });

        await runInDurableObject(stub, async (_instance, state) => {
            const { n: routeCount } = state.storage.sql.exec<{ n: number }>(
                'SELECT COUNT(*) AS n FROM routes',
            ).one();
            const { n: redirectCount } = state.storage.sql.exec<{ n: number }>(
                'SELECT COUNT(*) AS n FROM redirects',
            ).one();
            expect(routeCount).toBe(1);
            expect(redirectCount).toBe(3);
        });
    });

    it('creates separate routes for different substituted destinations', async () => {
        const stub = getStub('pattern-routes');
        await stub.log({
            ...baseEntry,
            path: '/e/1',
            shortUrl: 'e/:eventId',
            destinationUrl: 'https://www.meetup.com/web-performance-ny/events/1',
            vars: { eventId: '1' },
        });
        await stub.log({
            ...baseEntry,
            path: '/e/2',
            shortUrl: 'e/:eventId',
            destinationUrl: 'https://www.meetup.com/web-performance-ny/events/2',
            vars: { eventId: '2' },
        });

        await runInDurableObject(stub, async (_instance, state) => {
            const routes = [...state.storage.sql.exec<{ path: string }>(
                'SELECT path FROM routes ORDER BY path',
            )].map((r) => r.path);
            expect(routes).toEqual(['/e/1', '/e/2']);
        });
    });

    it('dedupes variable key/value pairs and links them via redirect_variables', async () => {
        const stub = getStub('vars');
        await stub.log({
            timestamp: '2026-04-20T10:00:00.000Z',
            path: '/e/1/twitter',
            shortUrl: 'e/:eventId/:source?',
            destinationUrl: 'https://www.meetup.com/web-performance-ny/events/1',
            vars: { eventId: '1', source: 'twitter' },
        });
        await stub.log({
            timestamp: '2026-04-20T10:01:00.000Z',
            path: '/e/1/linkedin',
            shortUrl: 'e/:eventId/:source?',
            destinationUrl: 'https://www.meetup.com/web-performance-ny/events/1',
            vars: { eventId: '1', source: 'linkedin' },
        });

        await runInDurableObject(stub, async (_instance, state) => {
            const vars = [...state.storage.sql.exec<{ key: string; value: string }>(
                'SELECT key, value FROM variables ORDER BY key, value',
            )];
            expect(vars).toEqual([
                { key: 'eventId', value: '1' },
                { key: 'source', value: 'linkedin' },
                { key: 'source', value: 'twitter' },
            ]);
            const { n } = state.storage.sql.exec<{ n: number }>(
                'SELECT COUNT(*) AS n FROM redirect_variables',
            ).one();
            expect(n).toBe(4);
        });
    });

    it('skips empty variable values', async () => {
        const stub = getStub('empty-vars');
        await stub.log({
            ...baseEntry,
            path: '/e/1',
            shortUrl: 'e/:eventId/:source?',
            destinationUrl: 'https://www.meetup.com/web-performance-ny/events/1',
            vars: { eventId: '1', source: '' },
        });

        await runInDurableObject(stub, async (_instance, state) => {
            const vars = [...state.storage.sql.exec<{ key: string }>(
                'SELECT key FROM variables',
            )].map((r) => r.key);
            expect(vars).toEqual(['eventId']);
        });
    });

    it('migrates a v1 schema into v2 preserving redirect history', async () => {
        const stub = getStub('migration-v1');

        await runInDurableObject(stub, async (_instance, state) => {
            const sql = state.storage.sql;

            // Tear down the v2 tables that the constructor created and seed
            // a simulated v1 schema with a handful of historical rows.
            sql.exec('DROP TABLE IF EXISTS redirect_variables');
            sql.exec('DROP TABLE IF EXISTS variables');
            sql.exec('DROP TABLE IF EXISTS redirects');
            sql.exec('DROP TABLE IF EXISTS routes');
            sql.exec('DROP TABLE IF EXISTS _schema_meta');
            sql.exec(`
                CREATE TABLE redirects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    path TEXT NOT NULL,
                    short_url TEXT NOT NULL,
                    destination_url TEXT NOT NULL
                )
            `);
            sql.exec(`
                CREATE TABLE variables (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    UNIQUE(key, value)
                )
            `);
            sql.exec(`
                CREATE TABLE redirect_variables (
                    redirect_id INTEGER NOT NULL,
                    variable_id INTEGER NOT NULL,
                    PRIMARY KEY (redirect_id, variable_id)
                )
            `);
            const seed = [
                ['2026-04-19T09:00:00.000Z', '/meetup', 'meetup', 'https://www.meetup.com/web-performance-ny/'],
                ['2026-04-19T09:01:00.000Z', '/meetup', 'meetup', 'https://www.meetup.com/web-performance-ny/'],
                ['2026-04-19T09:02:00.000Z', '/e/1', 'e/:eventId', 'https://www.meetup.com/web-performance-ny/events/1'],
            ];
            for (const [ts, path, shortUrl, dest] of seed) {
                sql.exec(
                    'INSERT INTO redirects (timestamp, path, short_url, destination_url) VALUES (?, ?, ?, ?)',
                    ts, path, shortUrl, dest,
                );
            }

            // Re-run the initialiser against the seeded v1 state.
            initSchema(sql);

            expect(schemaVersion(sql)).toBe(2);

            const routes = [...sql.exec<{ path: string; short_url: string; destination_url: string }>(
                'SELECT path, short_url, destination_url FROM routes ORDER BY path',
            )];
            expect(routes).toEqual([
                { path: '/e/1', short_url: 'e/:eventId', destination_url: 'https://www.meetup.com/web-performance-ny/events/1' },
                { path: '/meetup', short_url: 'meetup', destination_url: 'https://www.meetup.com/web-performance-ny/' },
            ]);

            const redirects = [...sql.exec<{ timestamp: string; route_id: number }>(
                'SELECT timestamp, route_id FROM redirects ORDER BY timestamp',
            )];
            expect(redirects).toHaveLength(3);
            // Both /meetup hits should resolve to the same route_id; /e/1 to a different one.
            expect(redirects[0]!.route_id).toBe(redirects[1]!.route_id);
            expect(redirects[2]!.route_id).not.toBe(redirects[0]!.route_id);

            // Re-running should be a no-op since user_version is already 2.
            initSchema(sql);
            expect(schemaVersion(sql)).toBe(2);
        });
    });
});
