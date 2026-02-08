import { QUERY_PROPERTY_EXTERNAL } from "../../constants/query";
import { BAD_EXTERNAL_LOAD_URL, parseUrl } from "../../utils/parseUrl";
import { LinkOutputView } from "./components/LinkOutputView";
import { LoaderOutputViewProps } from "./interface";

export const LoaderOutputViewUrl = ({ value }: LoaderOutputViewProps) => {
  const output = parseUrl(value);

  const href = (
    output === BAD_EXTERNAL_LOAD_URL
      ? null
      : (() => {
        const url = new URL(import.meta.env.BASE_URL, location.origin);
        const search = new URLSearchParams([[QUERY_PROPERTY_EXTERNAL, output]]);
        url.hash = "?" + search;
        return url.href;
      })()
  )

  return (
    <LinkOutputView
      fallbackMessage="Enter a valid URL"
      href={href}
      isValid={output !== BAD_EXTERNAL_LOAD_URL}
    />
  );
};
