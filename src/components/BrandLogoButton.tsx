import { HTMLProps, useState } from "react";
import { css } from "../../styled-system/css";
import { ActionButtonLink } from "./ActionButton";
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
          display: 'grid',
          gap: 8,
        })}>
          <p className={css({
            maxWidth: "60ch",
          })}>
            CodeVinci is a browser-based JavaScript playground that allows you to write and test code directly in your web browser.
            Built with esbuild, it provides a quick development environment with real-time preview capabilities and code persistence through URL sharing.
          </p>
          <p>
            <a
              href="https://github.com/amoshydra/CodeVinci"
              target="_blank"
              className={css({
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              })}
            >
              <span className={css({
                fontSize: 16,
                fontFamily: 'monospace',
                borderBottom: "8px solid transparent",
                borderColor: "rgba(13, 139, 201, 0.46)",
                "@media(hover: hover)": {
                  _hover: {
                    borderColor: "rgba(13, 139, 201, 0.66)",
                  }
                },
                _active: {
                  borderColor: "rgba(13, 139, 201, 0.86)",
                }
              })}>
                GitHub: amoshydra/CodeVinci
              </span>
            </a>

            <div className={css({ marginTop: 24, display: "grid", rowGap: 4 })}>
              <h2 className={css({ fontWeight: "bold" })}>Others</h2>
              <div className={css({ display: "flex", gap: 2, })}>
                <ActionButtonLink
                  href={`${import.meta.env.BASE_URL}`}
                  size="sm"
                >Home</ActionButtonLink>
                <ActionButtonLink
                  href={`${import.meta.env.BASE_URL}loader`}
                  size="sm"
                >Loader</ActionButtonLink>
              </div>
            </div>
          </p>
        </div>
      </Dialog>
    </>
  );
};
