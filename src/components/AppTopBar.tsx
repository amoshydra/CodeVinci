import { styled } from "../../styled-system/jsx";

export const AppTopBar = styled('header', {
  base: {
    borderColor: "stone.900",
    display: 'flex',
    justifyContent: "space-between",
    alignItems: "center",
    color: 'stone.50',
    background: 'stone.950',
    // min-height rather than height: the top inset extends the bar instead of
    // squeezing the controls when the notch overlaps it.
    minHeight: 9,
    flexShrink: 0,
    paddingTop: 'calc(0.25rem + var(--safe-area-top, 0px))',
    paddingBottom: 1,
    paddingLeft: 'calc(0.25rem + var(--safe-area-left, 0px))',
    paddingRight: 'calc(0.25rem + var(--safe-area-right, 0px))',
  }
});
