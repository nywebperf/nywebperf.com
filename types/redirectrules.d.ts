export type ReleaseRedirectRule = {
    destinationURL: string;
    shortURL: string;
    releaseDate: Date;
};

export type UnknownUrlRule = {
    unknownUrl: string;
};

export type PlainRedirectRule = {
    destinationURL: string;
    shortURL: string;
};

export type Rule = ReleaseRedirectRule | UnknownUrlRule | PlainRedirectRule;

export type Rules = Rule[];