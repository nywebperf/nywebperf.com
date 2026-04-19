const PARAM_SEGMENT = /^:([a-zA-Z_][a-zA-Z0-9_]*)(\?)?$/;
const PLACEHOLDER = /(?:^|\/):([a-zA-Z_][a-zA-Z0-9_]*)\??(?=\/|$)/;
const SUBSTITUTION = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g;

export function hasPlaceholders(shortURL: string): boolean {
    return PLACEHOLDER.test(shortURL);
}

export function compilePattern(shortURL: string): RegExp {
    const segments = shortURL.replace(/^\/+/, '').split('/');
    let source = '^';
    for (const seg of segments) {
        const param = seg.match(PARAM_SEGMENT);
        if (param) {
            const [, name, optional] = param;
            source += optional
                ? `(?:/(?<${name}>[^/]+))?`
                : `/(?<${name}>[^/]+)`;
        } else {
            source += '/' + seg.replace(REGEX_ESCAPE, '\\$&');
        }
    }
    source += '$';
    return new RegExp(source);
}

export function substituteDestination(
    destinationURL: string,
    vars: Record<string, string | undefined>
): string {
    return destinationURL.replace(SUBSTITUTION, (_, name) => {
        const value = vars[name];
        return value == null ? '' : value;
    });
}
