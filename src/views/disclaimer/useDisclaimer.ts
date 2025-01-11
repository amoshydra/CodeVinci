import { useState } from "react";
import { toggleComment } from "./toggleComment.util";

const STORAGE_KEY_ACCEPTED_DISCLAIMER = "accepted-disclaimer";
const initialIsDisclaimerAccepted =
  sessionStorage.getItem(STORAGE_KEY_ACCEPTED_DISCLAIMER) === "true";

export const useDisclaimer = () => {
  const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(
    initialIsDisclaimerAccepted,
  );
  const acceptDisclaimer = () => {
    sessionStorage.setItem(STORAGE_KEY_ACCEPTED_DISCLAIMER, "true");
    setIsDisclaimerAccepted(true);
  };

  return { isDisclaimerAccepted, acceptDisclaimer };
};
