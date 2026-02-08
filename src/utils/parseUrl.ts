// similar to parseURL
export const BAD_EXTERNAL_LOAD_URL = Symbol();
export const parseUrl = (urlString: string | null) => {
  if (!urlString) return BAD_EXTERNAL_LOAD_URL;
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) return BAD_EXTERNAL_LOAD_URL;
    return url.href;
  } catch (e) {
    return BAD_EXTERNAL_LOAD_URL;
  }
}
