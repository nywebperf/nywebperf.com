import type { UnknownUrlRule, ReleaseRedirectRule, PlainRedirectRule, Rules, Rule, } from '@/types/redirectrules';
import redirects from '@/redirectrules';

export default defineEventHandler(async (event) => {

    const { path } = event;

    for (const redirect of redirects) {

        if ("/" + redirect.shortURL === path) {

            const dateTime = new Date();

            if (redirect.releaseDate && redirect.releaseDate.getTime() > dateTime.getTime()) {
                return;
            } else {
                return sendRedirect(event, redirect.destinationURL, 301);
            }

        }
    }

    const unknowns: UnknownUrlRule[] = redirects.filter((rule: Rule): boolean => rule.hasOwnProperty('unknownUrl'));

    if (unknowns.length === 0) {
        return;
    }

    return sendRedirect(event, unknowns[0].unknownUrl, 302);

});