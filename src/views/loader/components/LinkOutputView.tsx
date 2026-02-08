import { css } from "../../../../styled-system/css";
import { styled } from "../../../../styled-system/jsx";

export interface LinkOutputViewProps {
  isValid: boolean;
  href: string | null | undefined;
  fallbackMessage: string
}

export const LinkOutputView = ({ isValid, href, fallbackMessage }: LinkOutputViewProps) => {
  if (!isValid || !href) {
    return (
      <Wrapper>{fallbackMessage}</Wrapper>
    )
  }

  return (
    <Wrapper>
      Click to open
      <div
        className={css({
          overflow: "hidden",
          textOverflow: "ellipsis",
          width: "full",
          whiteSpace: "pre",
        })}
      >
        <Base64AnchorLink
          href={href}
        >{href}</Base64AnchorLink>
      </div>
    </Wrapper>
  )
};

const Wrapper = styled("div", {
  base: {
    padding: 4,
    minWidth: 0,
  }
});


const Base64AnchorLink = styled("a", {
  base: {
    padding: 2,
    fontFamily: "mono",
    fontSize: "md",
    textDecoration: "underline",
  }
});
