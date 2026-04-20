/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers';

export type RedirectLogEntry = {
    timestamp: string;
    path: string;
    shortUrl: string;
    destinationUrl: string;
    vars: Record<string, string>;
};

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS redirects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        path TEXT NOT NULL,
        short_url TEXT NOT NULL,
        destination_url TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_redirects_timestamp ON redirects(timestamp);
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

export class RedirectLog extends DurableObject {
    sql: SqlStorage;

    constructor(ctx: DurableObjectState, env: unknown) {
        super(ctx, env);
        this.sql = ctx.storage.sql;
        this.sql.exec(SCHEMA);
    }

    async log(entry: RedirectLogEntry): Promise<void> {
        const inserted = this.sql.exec<{ id: number }>(
            'INSERT INTO redirects (timestamp, path, short_url, destination_url) VALUES (?, ?, ?, ?) RETURNING id',
            entry.timestamp,
            entry.path,
            entry.shortUrl,
            entry.destinationUrl,
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
                inserted.id,
                variable.id,
            );
        }
    }
}
