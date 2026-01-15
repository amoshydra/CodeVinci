import { ReactNode, useEffect, useRef } from "react";
import { css } from "../../styled-system/css";

export interface DialogProps {
  id: string;
  title: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export const Dialog = (props: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (props.isOpen) {
      ref.current?.showModal()
    } else {
      ref.current?.close();
    }
  }, [props.isOpen])

  return (
    <dialog
      ref={ref}
      id={props.id}
      onClose={props.onClose}
      className={css({
        border: 'none',
        borderRadius: 'md',
        padding: 4,
        boxShadow: 'lg',
        backgroundColor: 'stone.900',
        color: 'stone.50',
        justifySelf: "center",
        marginTop: 'min(2.5rem, 6vw)',
        _backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
        },
      })}
      onClick={e => e.stopPropagation()}
    >
      <div className={css({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 4,
      })}>
        <h2 className={css({
          fontSize: 'xl',
          fontWeight: 'bold',
        })}>
          {props.title}
        </h2>
        <button
          onClick={props.onClose}
          className={css({
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'lg',
            padding: 1,
          })}
        >
          ✕
        </button>
      </div>
      {props.children}
    </dialog>
  );
};
