
const getHashAsParams = (): URLSearchParams => {
  const input = window.location.hash.slice(1);
  return new URLSearchParams(input);
};

const get = (property: string): string | null => {
  const params = getHashAsParams();
  const value = params.get(property);

  if (value === null) null;

  return value;
};

const set = (property: string, value: string) => {
  // Prepare params
  const params = getHashAsParams();
  params.set(property, value);

  // Construct URL
  const url = new URL(window.location.href);
  url.hash = params.toString();

  // Update URL
  history.replaceState(null, "", url);
};

export const hashParams = {
  get,
  set,
}
