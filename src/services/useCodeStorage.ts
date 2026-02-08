import { useEffect, useState } from "react";
import { QUERY_PROPERTY_VALUE } from "../constants/query";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../utils/base64Buffer";
import { compress, decompress } from "../utils/compress";
import { hashParams } from "../utils/hashParams";

const getValueFromUrl = async (property: string, defaultValue: string) => {
  const value = hashParams.get(property);

  if (value === null) return defaultValue;

  return decompress(base64ToArrayBuffer(value));
};

const setValueToUrl = async (property: string, value: string) => {
  const compressed = await compress(value);
  const base64String = arrayBufferToBase64(compressed);
  // Prepare params
  hashParams.set(property, base64String);
};

export const useCodeStorage = (defaultValue: string) => {
  const [v, setV] = useState("");

  useEffect(() => {
    getValueFromUrl(QUERY_PROPERTY_VALUE, defaultValue)
      .then((value) => {
        setV(value);
      })
      .catch(console.error);
  }, []);

  const setValue = (newValue: string) => {
    setV(newValue);
    setValueToUrl(QUERY_PROPERTY_VALUE, newValue).catch(console.error);
  };

  return [v, setValue] as const;
};
