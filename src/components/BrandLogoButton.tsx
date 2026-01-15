import { HTMLProps, useState } from "react";
import { css } from "../../styled-system/css";
import { Dialog } from "./Dialog";

export interface BrandLogoButton extends HTMLProps<HTMLButtonElement> {
}

export const BrandLogoButton = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setIsAboutOpen(true)}
        className={css({
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 'inherit',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          padding: 0,
        })}
      >
        CodeVinci
      </button>

      <Dialog
        id="about-modal"
        title="About CodeVinci"
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      >
        <div className={css({
          py: 2,
        })}>
          <p>CodeVinci is a powerful code editor and viewer.</p>
        </div>
      </Dialog>
    </>
  );
};
