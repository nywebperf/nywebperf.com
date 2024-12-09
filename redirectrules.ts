const redirects = [
    {
        destinationURL: 'https://alexchernyshev.com/',
        shortURL: 'alex',
        releaseDate: new Date('December 3, 2024 12:00:00')
        // Add another "rule" that if a "default path" is included to redirect to specified
        //ex: default: 'https://www.wikipedia.org/',
    },
    {
        destinationURL: 'https://www.sergeychernyshev.com/',
        shortURL: 'sergey',
        releaseDate: new Date('July 16, 2024 12:00:00')
    },
    {
        destinationURL: 'https://www.nikolaschernyshev.com/',
        shortURL: 'Nik',
    },
];

export default redirects;