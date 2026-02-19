export function isPdfUrl(url: string | undefined | null): boolean {
    if (!url) return false;
    const path = url.split('?')[0] ?? '';
    return path.toLowerCase().endsWith('.pdf');
}
