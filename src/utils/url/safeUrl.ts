  /**
   * Utility to create a clean and safe url
   * @param parts 
   * @returns 
   */
  const safeUrl = (parts: string[]) => {
    let url = parts.join('/');
    return `${url.replace(/\/+$/, '')}`;
  }

  /**
   * Returns a safe URL for a CDN resource, based on the CDN_ROOT environment variable.
   * If CDN_ROOT is not set, it defaults to 'http://localhost:4000/cdn'.
   * The provided route is appended to the CDN_ROOT, ensuring that there are no duplicate slashes.
   * @param route 
   * @returns 
   */
  const safeCDNUrl = (route: string) => { 
    const { CDN_ROOT = 'http://localhost:4000/cdn' } = process.env;
    return safeUrl([CDN_ROOT, route]);
  }


  export default safeUrl;
  export { safeCDNUrl };