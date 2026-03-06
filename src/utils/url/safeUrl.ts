  /**
   * Utility to create a clean and safe URL from path segments.
   *
   * - Joins parts with `/`
   * - Collapses duplicate slashes (preserving `://` in protocol)
   * - Strips trailing slashes
   *
   * @param parts - URL segments to join
   * @returns A normalised URL string
   */
  const safeUrl = (parts: string[]) => {
    let url = parts
      .map((p) => p.replace(/\/+$/, ''))   // strip trailing slashes from each part
      .join('/');
    // Collapse duplicate slashes but preserve the protocol's ://
    url = url.replace(/([^:])\/{2,}/g, '$1/');
    // Remove any remaining trailing slashes
    return url.replace(/\/+$/, '');
  }

  /**
   * Returns a safe URL for a CDN resource, based on the `CDN_ROOT` environment variable.
   *
   * Normalises the root (strips trailing `/`) and joins with the provided route,
   * so `http://host/cdn/` + `themes/img.png` never produces a double-slash.
   *
   * Falls back to `http://localhost:4000/cdn` when `CDN_ROOT` is unset.
   *
   * @param route - The CDN-relative path (e.g. `themes/reactory/images/logo.png`)
   * @returns Fully-qualified CDN URL
   */
  const safeCDNUrl = (route: string) => {
    const { CDN_ROOT = 'http://localhost:4000/cdn' } = process.env;
    return safeUrl([CDN_ROOT, route]);
  }


  export default safeUrl;
  export { safeCDNUrl };