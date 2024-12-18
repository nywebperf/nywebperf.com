import redirects from '@/redirectrules';

export default defineEventHandler(async (event) => {

    const { path } = event;
    const dateTime = new Date();
    const unknowns = redirects.filter(rule => rule.unknownUrl);

    for (const redirect of redirects) {

        if ("/" + redirect.shortURL === path) {

            if (redirect.releaseDate && redirect.releaseDate.getTime() > dateTime.getTime()) {
                return;
            } else {
                return sendRedirect(event, redirect.destinationURL, 301);
            }

        }
    }

    if (unknowns.length === 0) {
        return;
    }

    return sendRedirect(event, unknowns[0].unknownUrl, 302);

});