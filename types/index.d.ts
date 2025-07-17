export function watch({ onChange, patterns }: {
    onChange: (paths: string[]) => void;
    patterns: string[];
}): () => void;
