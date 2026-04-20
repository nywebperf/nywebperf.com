/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers';

export type RedirectLogEntry = {
    timestamp: string;
    path: string;
    shortUrl: string;
    destinationUrl: string;
    vars: Record<string, string>;
};

const SCHEMA_VERSION = 2;

const CURRENT_SCHEMA = `
    CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        short_url TEXT NOT NULL,
        destination_url TEXT NOT NULL,
        UNIQUE(path, short_url, destination_url)
    );
    CREATE INDEX IF NOT EXISTS idx_routes_short_url ON routes(short_url);
    CREATE TABLE IF NOT EXISTS redirects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        route_id INTEGER NOT NULL REFERENCES routes(id)
    );
    CREATE INDEX IF NOT EXISTS idx_redirects_timestamp ON redirects(timestamp);
    CREATE INDEX IF NOT EXISTS idx_redirects_route ON redirects(route_id);
    CREATE TABLE IF NOT EXISTS variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        UNIQUE(key, value)
    );
    CREATE INDEX IF NOT EXISTS idx_variables_key ON variables(key);
    CREATE TABLE IF NOT EXISTS redirect_variables (
        redirect_id INTEGER NOT NULL,
        variable_id INTEGER NOT NULL,
        PRIMARY KEY (redirect_id, variable_id)
    );
    CREATE INDEX IF NOT EXISTS idx_redirect_variables_variable ON redirect_variables(variable_id);
`;

function readUserVersion(sql: SqlStorage): number {
    const row = sql.exec('PRAGMA user_version').one() as Record<string, unknown>;
    const raw = row.user_version ?? Object.values(row)[0];
    return Number(raw) || 0;
}

function hasLegacyRedirectsTable(sql: SqlStorage): boolean {
    const columns = [...sql.exec<{ name: string }>("PRAGMA table_info('redirects')")]
        .map((r) => r.name);
    return columns.includes('path');
}

// v1 stored path / short_url / destination_url on every `redirects` row.
// v2 normalizes them into a `routes` table and keeps only `route_id` on each redirect.
function migrateV1ToV2(sql: SqlStorage): void {
    sql.exec(`
        CREATE TABLE routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            short_url TEXT NOT NULL,
            destination_url TEXT NOT NULL,
            UNIQUE(path, short_url, destination_url)
        );
    `);
    sql.exec(`
        INSERT INTO routes (path, short_url, destination_url)
        SELECT DISTINCT path, short_url, destination_url FROM redirects;
    `);
    sql.exec(`
        CREATE TABLE redirects_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            route_id INTEGER NOT NULL REFERENCES routes(id)
        );
    `);
    sql.exec(`
        INSERT INTO redirects_new (id, timestamp, route_id)
        SELECT r.id, r.timestamp, rt.id
        FROM redirects r
        JOIN routes rt
          ON r.path = rt.path
         AND r.short_url = rt.short_url
         AND r.destination_url = rt.destination_url;
    `);
    sql.exec('DROP TABLE redirects;');
    sql.exec('ALTER TABLE redirects_new RENAME TO redirects;');
    sql.exec('CREATE INDEX idx_routes_short_url ON routes(short_url);');
    sql.exec('CREATE INDEX idx_redirects_timestamp ON redirects(timestamp);');
    sql.exec('CREATE INDEX idx_redirects_route ON redirects(route_id);');
}

function initSchema(sql: SqlStorage): void {
    if (readUserVersion(sql) >= SCHEMA_VERSION) return;

    if (hasLegacyRedirectsTable(sql)) {
        migrateV1ToV2(sql);
    } else {
        sql.exec(CURRENT_SCHEMA);
    }

    sql.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export class RedirectLog extends DurableObject {
    sql: SqlStorage;

    constructor(ctx: DurableObjectState, env: unknown) {
        super(ctx, env);
        this.sql = ctx.storage.sql;
        initSchema(this.sql);
    }

    async log(entry: RedirectLogEntry): Promise<void> {
        this.sql.exec(
            'INSERT OR IGNORE INTO routes (path, short_url, destination_url) VALUES (?, ?, ?)',
            entry.path,
            entry.shortUrl,
            entry.destinationUrl,
        );
        const route = this.sql.exec<{ id: number }>(
            'SELECT id FROM routes WHERE path = ? AND short_url = ? AND destination_url = ?',
            entry.path,
            entry.shortUrl,
            entry.destinationUrl,
        ).one();
        const redirect = this.sql.exec<{ id: number }>(
            'INSERT INTO redirects (timestamp, route_id) VALUES (?, ?) RETURNING id',
            entry.timestamp,
            route.id,
        ).one();

        for (const [key, value] of Object.entries(entry.vars)) {
            if (value === undefined || value === null || value === '') continue;
            this.sql.exec(
                'INSERT OR IGNORE INTO variables (key, value) VALUES (?, ?)',
                key,
                value,
            );
            const variable = this.sql.exec<{ id: number }>(
                'SELECT id FROM variables WHERE key = ? AND value = ?',
                key,
                value,
            ).one();
            this.sql.exec(
                'INSERT OR IGNORE INTO redirect_variables (redirect_id, variable_id) VALUES (?, ?)',
                redirect.id,
                variable.id,
            );
        }
    }
}
