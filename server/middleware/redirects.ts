
const redirects = [
    {
        destinationURL: 'https://alexchernyshev.com/',
        shortURL: 'alex',
        releaseDate: new Date('July 18, 2024 12:00:00')
    },
    {
        destinationURL: 'https://www.sergeychernyshev.com/',
        shortURL: 'sergey',
        releaseDate: new Date('July 16, 2024 12:00:00')
    },
];

export default defineEventHandler(async (event) => {

    const { path } = event;

    for (const redirect of redirects) {
        if ("/" + redirect.shortURL === path) {
            return sendRedirect(event, redirect.destinationURL, 307);
        }
    }

});