import { useEffect, useState } from "react";
import { compress, decompress } from "../utils/compress";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../utils/base64Buffer";

const getHashAsParams = (): URLSearchParams => {
  const input = window.location.hash.slice(1);
  return new URLSearchParams(input);
};

const getValueFromUrl = async (property: string) => {
  const params = getHashAsParams();
  const value = params.get(property);
  return value ? await decompress(base64ToArrayBuffer(value)) : "";
};

const setValueToUrl = async (property: string, value: string) => {
  const compressed = await compress(value);
  const base64String = arrayBufferToBase64(compressed);
  // Prepare params
  const params = getHashAsParams();
  params.set("", "");
  params.delete(property); // we will maintain the hash manually
  const hashPart = `&${property}=${decodeURI(base64String)}`;

  // Construct URL
  const url = new URL(window.location.href);
  url.hash = params.toString();

  // Update URL
  history.replaceState(null, "", url + hashPart);
};

const QUERY_PROPERTY = "v";

export const useCodeStorage = () => {
  const [v, setV] = useState("");

  useEffect(() => {
    getValueFromUrl(QUERY_PROPERTY)
      .then((value) => {
        setV(value);
      })
      .catch(console.error);
  }, []);

  const setValue = (newValue: string) => {
    setV(newValue);
    setValueToUrl(QUERY_PROPERTY, newValue).catch(console.error);
  };

  return [v, setValue] as const;
};