import { InputHTMLAttributes, LabelHTMLAttributes, useId } from "react";
import { styled } from "../../styled-system/jsx";


export interface RadioButtonProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: LabelHTMLAttributes<HTMLLabelElement>;
  children: string;
}

export const RadioButton = ({ label, children, ...props }: RadioButtonProps) => {
  const id = useId();
  const screenReaderLabelId = `${id}-sr-label`
  return (
    <StyledRadioLabel htmlFor={id} {...label}>
      <StyledRadioInput id={id} aria-labelledby={screenReaderLabelId} {...props} type="radio" />
      <span id={screenReaderLabelId} aria-hidden>{children}</span>
    </StyledRadioLabel>
  );
};

const StyledRadioInput = styled("input", {
  base: {
    opacity: 0,
    height: "full",
    width: "full",
    position: "absolute",
    pointerEvents: "none",
    inset: 0,
  },
});
const StyledRadioLabel = styled("label", {
  base: {
    display: "inline-block",
    position: "relative",
    border: "2px solid",
    borderColor: "slate.300",
    borderRadius: "md",
    py: 2,
    px: 4,
    "&:has(input:checked)": {
      borderColor: "green"
    },
    "&:has(input:focus-visible)": {
      outline: "2px solid",
      outlineColor: "blue.300",
      outlineOffset: "[1px]",
    },
  },
});
