import { InputHTMLAttributes, useId } from "react";
import { css } from "../../styled-system/css";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  onChange?: (checked: boolean) => void;
}

export const Switch = ({ onChange, ...props }: SwitchProps) => {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  return (
    <label
      htmlFor={id}
      className={css({
        position: 'relative',
        display: 'inline-block',
        w: '10',
        h: '5',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
      })}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        onChange={handleChange}
        className={css({
          position: 'absolute',
          w: '0',
          h: '0',
          opacity: '0',
          pointerEvents: 'none',
        })}
        {...props}
      />
      <span
        className={css({
          position: 'absolute',
          inset: '0',
          bg: props.checked ? 'blue.500' : 'stone.600',
          borderRadius: 'full',
          transition: 'background 0.2s',
          _before: {
            content: '""',
            position: 'absolute',
            h: '3.5',
            w: '3.5',
            bg: 'white',
            borderRadius: 'full',
            transition: 'transform 0.2s',
            insetBlock: '0',
            marginBlock: 'auto',
            left: '1',
            transform: props.checked ? 'translateX(18px)' : 'translateX(0)',
          },
          _active: {
            bg: props.checked ? 'blue.600' : 'stone.500',
          },
        })}
      />
    </label>
  );
};
