import { lazy, Suspense } from "react";
import { css } from "../../../../styled-system/css";
import { ErrorBoundary } from "../../ErrorBoundary";
import { ShareButtonDialogQrBoxProps } from "./interface";

const QRCodeCanvas = lazy(() => import('qrcode.react').then(m => ({ default: m.QRCodeCanvas })));

export const ShareButtonDialogQrBox = ({ value }: ShareButtonDialogQrBoxProps) => {
  return (
    <div
      className={css({
        background: "slate.800",
        width: "full",
        height: "full",
        aspectRatio: "1 / 1",
        borderRadius: "md",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "& > canvas": {
          width: '100% !important',
          height: '100% !important',
        }
      })}
    >
      <Suspense fallback={<div className={css({ color: "white" })}>Loading...</div>}>
        <ErrorBoundary
          key={value.length}
          fallback={(error) => (
            <div className={css({ color: "red.400", textAlign: "center" })}>
              Failed to generate QR code
              <br />
              {error.message}
            </div>
          )}
        >
          <QRCodeCanvas
            value={value}
            level="L"
            size={window.innerWidth}
            className={css({
              padding: '1.5',
              background: "white",
            })}
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};
