import redirects from '@/redirectrules';

export default defineEventHandler(async (event) => {

    const { path } = event;
    const dateTime = new Date();

    for (const redirect of redirects) {

        if ("/" + redirect.shortURL === path) {

            if (redirect.releaseDate && redirect.releaseDate.getTime() > dateTime.getTime()) {
                return;
            } else {
                return sendRedirect(event, redirect.destinationURL, 307);
            }

        }
        /*
        else if (redirect.default){
            return sendRedirect(event, redirect.default, 307);
        }
        
        */
    }

});