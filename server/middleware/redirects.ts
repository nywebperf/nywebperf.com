import redirects from '@/redirectrules';

export default defineEventHandler(async (event) => {

    appendResponseHeader(event, "Cache-Control", "no-store");

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

    const unknowns = redirects.filter(rule => rule.hasOwnProperty('unknownUrl'));

    if (unknowns.length === 0) {
        return;
    }

    return sendRedirect(event, unknowns[0].unknownUrl, 302);

});