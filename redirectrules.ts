const redirects = [
    {
        unknownUrl: 'https://www.wikipedia.org/'
        // Add another "rule" that if a "default path" is included to redirect to specified
        //ex: unknownUrl: 'https://www.wikipedia.org/',
    },
    {
        destinationURL: 'https://alexchernyshev.com/',
        shortURL: 'alex',
        releaseDate: new Date('December 28, 2024 17:08:00')
    },
    // {
    //     destinationURL: 'https://www.google.com/',
    //     shortURL: '',
    //     releaseDate: new Date('December 3, 2024 12:00:00')
    // },
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