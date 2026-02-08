import { useMemo } from "react";
import { QUERY_PROPERTY_VALUE } from "../../constants/query";
import { LinkOutputView } from "./components/LinkOutputView";
import { useOutputLink } from "./hooks/useOutputLink";
import { type LoaderOutputViewProps } from "./interface";

const sep = "=H4sIAAAAAAAAA"

export const LoaderOutputViewBase64 = ({ value }: LoaderOutputViewProps) => {
  const decodedValue = useMemo(() => {
    const [original, ...parts] = value.split(sep);
    if (parts.length) {
      const joinedQuery = QUERY_PROPERTY_VALUE + (sep + parts.join(sep));
      return new URLSearchParams(joinedQuery).get(QUERY_PROPERTY_VALUE) || "";
    }
    return decodeURIComponent(original);
  }, [value]);

  const isValidBase64 = useMemo(() => {
    try {
      const output = atob(decodedValue);
      return output.startsWith("\u001f\u008b\u0008");
    } catch (e) {
      return false;
    }
  }, [decodedValue]);

  const href = useOutputLink(decodedValue, QUERY_PROPERTY_VALUE);

  return (
    <LinkOutputView
      fallbackMessage="Enter a valid base64 to create URL"
      href={href}
      isValid={isValidBase64}
    />
  );
};
