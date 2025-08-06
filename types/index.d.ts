export function watch({ debounce, onChange, patterns }: {
    debounce?: number;
    onChange: (paths: string[]) => void;
    patterns: string[];
}): () => void;
