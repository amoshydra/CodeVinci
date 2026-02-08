import { useState } from 'react';
import { css } from '../../../styled-system/css';
import { styled } from '../../../styled-system/jsx';
import { ActionButton } from '../../components/ActionButton';

export interface DisclaimerForExternalLoadProps {
  externalValue: string | null;
  onLoadAccept: (code: string) => void;
}

export const DisclaimerForExternalLoad = ({ onLoadAccept, externalValue }: DisclaimerForExternalLoadProps) => {
  const parsedUrl = parseUrl(externalValue);
  const isValidUrl = parsedUrl !== BAD_EXTERNAL_LOAD_URL;
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const downloadCode = async () => {
    setIsLoading(true);

    const hadError = !!error;
    setError(null);

    const fetchStart = Date.now();

    try {
      if (typeof parsedUrl === "string") {
        const code = await fetchCodeFromUrl(parsedUrl);
        const augmented = [`// @from: ${parsedUrl}`, code].join("\n")
        onLoadAccept(augmented);
      } else {
        setError(new Error("URL is empty"));
      }
    } catch (error) {
      if (hadError) {
        const fetchEnd = Date.now();
        const elapsed = fetchEnd - fetchStart;
        // Let to error disappear for at least 600ms before new error is surfaced to user.
        const resurfaceTimeout = Math.max(600 - elapsed, 0)

        await new Promise((r) => setTimeout(r, resurfaceTimeout));
      }
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {
        isValidUrl
          ?
            <Wrapper>
              <div>You are about to load code this URL</div>

              {error && (
                <div className={css({ color: "red.500", marginBottom: 2, })}>
                  <p>Unable to load. Check if the URL is correct.</p>
                  <p>The server might also prevent you from loading the code from here.</p>
                  <br />
                  <pre>Error: {error.message}</pre>
                </div>
              )}

              <UrlPreviewer valid>
                {parsedUrl}
              </UrlPreviewer >
            </Wrapper>
          : <Wrapper>
              <div>The external URL provided is malformed.</div>
              <UrlPreviewer>
                {externalValue}
              </UrlPreviewer>
            </Wrapper>
      }

      <div
        className={css({
          display: "flex",
          justifyContent: "flex-end",
          gap: "3"
        })}
      >
        <ActionButton visual="secondary"
          onClick={() => {
            window.close();
          }}
        >
          Close
        </ActionButton>
        {
          isValidUrl && (
            <ActionButton
              visual="primary"
              onClick={downloadCode}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load from URL"}
            </ActionButton>
          )
        }
      </div>
    </>
  );
};


const fetchCodeFromUrl = async(url: string) => {
  const response = await fetch(url);
  const text = await response.text();
  return text;
};

// similar to parseURL
const BAD_EXTERNAL_LOAD_URL = Symbol();
const parseUrl = (urlString: string | null) => {
  if (!urlString) return BAD_EXTERNAL_LOAD_URL;
  try {
    const url = new URL(urlString);
    if (!["http:", "https:"].includes(url.protocol)) return BAD_EXTERNAL_LOAD_URL;
    return url.href;
  } catch (e) {
    return BAD_EXTERNAL_LOAD_URL;
  }
}

const UrlPreviewer = styled("pre", {
  base: {
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    border: "1px solid",
    borderColor: "red.900",
    padding: 2,
    fontWeight: 600,
    borderRadius: "sm",
  },
  variants: {
    valid: {
      true: {
        borderColor: "slate.600",
      },
    }
  },
});

const Wrapper = styled("div", {
  base: {
    display: "grid",
    gap: 3,
  }
});
