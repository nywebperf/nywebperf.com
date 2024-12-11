import redirects from '@/redirectrules';

export default defineEventHandler(async (event) => {

    const { path } = event;
    const dateTime = new Date();
    const defaults = redirects.filter(rule => rule.default);

    for (const redirect of redirects) {

        if ("/" + redirect.shortURL === path) {

            if (redirect.releaseDate && redirect.releaseDate.getTime() > dateTime.getTime()) {
                return;
            } else {
                return sendRedirect(event, redirect.destinationURL, 301);
            }

        }
    }

    if (defaults.length === 0) {
        return;
    }

    return sendRedirect(event, defaults[0].default, 302);

});