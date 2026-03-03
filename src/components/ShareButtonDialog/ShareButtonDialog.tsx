import { ReactNode, useId } from "react";
import { css } from "../../../styled-system/css";
import { ActionButton } from "../ActionButton";
import { Dialog, type DialogProps } from "../Dialog";

export interface ShareButtonDialogProps extends Omit<DialogProps, "id" | "children" | "title"> {};

export const ShareButtonDialog = (props: ShareButtonDialogProps) => {
  const id = useId();

  const shareUrl = location.href;
  const canShare = navigator.canShare?.({
    url: shareUrl,
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
  };
  const handleShare = () => {
    navigator.share({
      url: shareUrl,
    })
  };


  return (
    <Dialog
      id={id}
      title="Share"
      {...props}
    >
      <div
        className={css({
          display: 'grid',
          gap: "4",
        })}
      >
        <QrBox />

        <ShareInputBox value={shareUrl} />

        <div
          className={css({
            display: 'flex',
            gap: "2",
            marginTop: "6",
            justifyContent: "right",
          })}
        >
          <ActionButton onClick={handleCopy}>
            <PressToggleSpan
              idleNode={"Copy "}
              activeNode={"(Copied)"}
            />
          </ActionButton>
          {
            canShare && <ActionButton onClick={handleShare}>Share</ActionButton>
          }
        </div>
      </div>
    </Dialog>
  )
};

const ShareInputBox = ({ value }: { value: string }) => {
  return (
    <textarea
      value={value}
      readOnly
      aria-label="url"
      className={css({
        userSelect: "all",
        fontFamily: "monospace",
        maxWidth: "full",
        width: "96",
      })}
    />
  );
}

const QrBox = () => {
  return (
    <button
      className={css({
        background: "slate.800",
        width: "full",
        height: "full",
        aspectRatio: "1 / 1",
        borderRadius: "md",
      })}
    >
      Click to generate QR
    </button>
  );
};

const PressToggleSpan = ({ idleNode, activeNode }: { idleNode: ReactNode, activeNode: ReactNode }) => {
  return <span
    className={css({
      userSelect: "none",
      '& > [data-state]': {
        transitionProperty: "display, opacity",
        transitionBehavior: "allow-discrete",
      },
      '& > [data-state="idle"]': { display: "inline", opacity: 1, transitionDuration: "2s", transitionTimingFunction: "step-end" },
      '& > [data-state="active"]': { display: "none", opacity: 0, transitionDuration: "2s", transitionTimingFunction: "step-end" },
      'button:active > &': {
        // @TODO: transition duration does not apply to display none to display inline when i move my finger away (become in-active)
        '& > [data-state="idle"]': { display: "none", opacity: 0, transitionDuration: "0s", transitionTimingFunction: "step-end" },
        '& > [data-state="active"]': { display: "inline", opacity: 1, transitionDuration: "0s", transitionTimingFunction: "step-start" },
      },
    })}
  >
    <span data-state="idle">{idleNode}</span>
    <span data-state="active">{activeNode}</span>
  </span>
};