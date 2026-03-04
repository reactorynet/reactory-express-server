  /**
   * Utility to create a clean and safe url
   * @param parts 
   * @returns 
   */
  const safeUrl = (parts: string[]) => {
    let url = parts.join('/');
    return `${url.replace(/\/+$/, '')}`;
  }

  export default safeUrl;