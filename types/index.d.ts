export function watch({ onChange, patterns }: {
    onChange: (path: string) => void;
    patterns: string[];
}): () => void;
