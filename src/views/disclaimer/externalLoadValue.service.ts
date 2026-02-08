import { QUERY_PROPERTY_EXTERNAL } from "../../constants/query";
import { hashParams } from "../../utils/hashParams";

export const externalLoadQueryValue = (() => {
  const externalLoadUrl = (hashParams.get(QUERY_PROPERTY_EXTERNAL) || "").trim();
  if (!externalLoadUrl) return null;

  return externalLoadUrl;
})();
