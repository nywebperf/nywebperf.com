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
    CREATE TABLE IF NOT EXISTS _schema_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
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

function tableExists(sql: SqlStorage, name: string): boolean {
    const rows = [...sql.exec<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        name,
    )];
    return rows.length > 0;
}

function readSchemaVersion(sql: SqlStorage): number {
    if (!tableExists(sql, '_schema_meta')) return 0;
    const [row] = [...sql.exec<{ value: string }>(
        "SELECT value FROM _schema_meta WHERE key = 'version'",
    )];
    if (!row) return 0;
    return Number(row.value) || 0;
}

function writeSchemaVersion(sql: SqlStorage, version: number): void {
    sql.exec(
        `INSERT INTO _schema_meta (key, value) VALUES ('version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        String(version),
    );
}

function hasLegacyRedirectsTable(sql: SqlStorage): boolean {
    const [row] = [...sql.exec<{ sql: string | null }>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='redirects'",
    )];
    if (!row) return false;
    const createSql = row.sql ?? '';
    // v1 defined redirects(... path TEXT NOT NULL ...). v2 has no `path` column.
    return /\bpath\b\s+TEXT\b/i.test(createSql);
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
        )
    `);
    sql.exec(`
        INSERT INTO routes (path, short_url, destination_url)
        SELECT DISTINCT path, short_url, destination_url FROM redirects
    `);
    sql.exec(`
        CREATE TABLE redirects_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            route_id INTEGER NOT NULL REFERENCES routes(id)
        )
    `);
    sql.exec(`
        INSERT INTO redirects_new (id, timestamp, route_id)
        SELECT r.id, r.timestamp, rt.id
        FROM redirects r
        JOIN routes rt
          ON r.path = rt.path
         AND r.short_url = rt.short_url
         AND r.destination_url = rt.destination_url
    `);
    sql.exec('DROP TABLE redirects');
    sql.exec('ALTER TABLE redirects_new RENAME TO redirects');
    sql.exec('CREATE INDEX idx_routes_short_url ON routes(short_url)');
    sql.exec('CREATE INDEX idx_redirects_timestamp ON redirects(timestamp)');
    sql.exec('CREATE INDEX idx_redirects_route ON redirects(route_id)');
    sql.exec(`
        CREATE TABLE IF NOT EXISTS _schema_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `);
}

export function initSchema(sql: SqlStorage): void {
    if (readSchemaVersion(sql) >= SCHEMA_VERSION) return;

    if (hasLegacyRedirectsTable(sql)) {
        migrateV1ToV2(sql);
    } else {
        sql.exec(CURRENT_SCHEMA);
    }

    writeSchemaVersion(sql, SCHEMA_VERSION);
}

export class RedirectLog extends DurableObject<unknown> {
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
