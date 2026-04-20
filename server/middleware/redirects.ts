import redirects from '@/redirectrules';
import type { RedirectLog, RedirectLogEntry } from '@/server/durable-objects/redirect-log';

type RedirectRule = {
    destinationURL?: string;
    shortURL?: string | RegExp;
    releaseDate?: Date;
    unknownUrl?: string;
};

type CloudflareEnv = {
    REDIRECT_LOG?: DurableObjectNamespace<RedirectLog>;
};

export default defineEventHandler(async (event) => {

    appendResponseHeader(event, "Cache-Control", "no-store");

    const path = event.path.split('?')[0] ?? event.path;
    const now = new Date();

    for (const redirect of redirects as RedirectRule[]) {

        if (redirect.shortURL === undefined) continue;

        let vars: Record<string, string> | null = null;

        if (redirect.shortURL instanceof RegExp) {
            const match = redirect.shortURL.exec(path);
            if (match) vars = { ...(match.groups ?? {}) };
        } else if (hasPlaceholders(redirect.shortURL)) {
            const match = compilePattern(redirect.shortURL).exec(path);
            if (match) vars = { ...(match.groups ?? {}) };
        } else if ('/' + redirect.shortURL === path) {
            vars = {};
        }

        if (!vars) continue;

        if (redirect.releaseDate && redirect.releaseDate.getTime() > now.getTime()) {
            return;
        }

        if (!redirect.destinationURL) continue;

        const destination = substituteDestination(redirect.destinationURL, vars);
        const entry: RedirectLogEntry = {
            timestamp: now.toISOString(),
            path,
            shortUrl: redirect.shortURL instanceof RegExp
                ? redirect.shortURL.toString()
                : redirect.shortURL,
            destinationUrl: destination,
            vars,
        };

        const response = sendRedirect(event, destination, 301);
        scheduleLog(event, entry);
        return response;
    }

    const unknowns = (redirects as RedirectRule[]).filter(rule => rule.unknownUrl);

    if (unknowns.length === 0) {
        return;
    }

    return sendRedirect(event, unknowns[0]!.unknownUrl!, 302);

});

function scheduleLog(event: any, entry: RedirectLogEntry): void {
    const cloudflare = event.context?.cloudflare;
    const ctx = cloudflare?.context as ExecutionContext | undefined;
    const binding = (cloudflare?.env as CloudflareEnv | undefined)?.REDIRECT_LOG;
    if (!binding || !ctx) return;
    const stub = binding.get(binding.idFromName('singleton'));
    ctx.waitUntil(
        stub.log(entry).catch((err: unknown) => {
            console.error('redirect log failed', err);
        }),
    );
}
