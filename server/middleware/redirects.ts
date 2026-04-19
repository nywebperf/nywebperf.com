import redirects from '@/redirectrules';

type RedirectRule = {
    destinationURL?: string;
    shortURL?: string | RegExp;
    releaseDate?: Date;
    unknownUrl?: string;
};

export default defineEventHandler(async (event) => {

    appendResponseHeader(event, "Cache-Control", "no-store");

    const path = event.path.split('?')[0];
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
        return sendRedirect(event, destination, 301);
    }

    const unknowns = (redirects as RedirectRule[]).filter(rule => rule.unknownUrl);

    if (unknowns.length === 0) {
        return;
    }

    return sendRedirect(event, unknowns[0].unknownUrl!, 302);

});
