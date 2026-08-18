// A path on this site, and nothing else. "//evil.example" is a valid relative
// URL that browsers read as a protocol relative link, so a bare startsWith('/')
// is not enough to keep a redirect at home.
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}
