/**
 * Taken from https://nodejs.org/api/url.html#url_url_resolve_from_to
 * which is the accepted standard for safely resolving urls by joining them.
 * */
const resolve = (from: string, to: string) => {
  const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
  if (resolvedUrl.protocol === 'resolve:') {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl;
    return pathname + search + hash;
  }
  return resolvedUrl.toString();
};

export default resolve;