# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Using URL Shortener

To use URL Shortener for your URLs, fork this repository.
In the redirectrules.ts file you will see an example rule for redirecting.
They will be structured like this:

``
const redirects = [
    {
        destinationURL: 'https://www.wikipedia.org/',
        shortURL: 'wiki',
        // releaseDate: new Date('December 3, 2024 12:00:00')
    },
];
``

To create a basic rule, you just need to use one object and fill in the "destinationURL" (The site you wish to redirect to) and the "shortURL", which is what will be displayed as the shortened path.

To add more redirects, add another object to the "redirects" array structured the same way as the example.

### Adding a release date

To add a release date to the redirect, add an optional releaseDate key (as seen in the example). Add a date in the format seen in the example.
This will prevent the redirect you specified from happening until the date you entered has been reached.
Before the release date, any visitors will instead see a page with the release date listed and with a timer showing the remaining time until the release date.

