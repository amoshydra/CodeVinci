import "./../App.css";

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { css } from '../../styled-system/css';
import { styled } from "../../styled-system/jsx";
import { AppTopBar } from "../components/AppTopBar";
import { BrandLogoButton } from "../components/BrandLogoButton";
import { RadioButton } from "../components/RadioButton";
import { Editor } from "../views/editor/Editor";
import { LoaderOutputViewBase64 } from "../views/loader/LoaderOutputView.base64";
import { LoaderOutputViewHtml } from "../views/loader/LoaderOutputView.html";
import { LoaderOutputViewUrl } from "../views/loader/LoaderOutputView.url";
import { useAnyLoader, type UseAnyLoaderMode } from "../views/loader/useAnyLoader";

const FromAnyLoader = () => {
  const { mode, onModeChange, value, onValueChange, editorConfig } = useAnyLoader();

  return (
    <div
      className={css({
        height: 'full',
        display: "grid",
        rowGap: 2,
        gridTemplateColumns: "1fr",
        gridTemplateRows: "min-content min-content",
      })}
    >
      <AppTopBar>
        <div className={css({ display: "flex", gap: 2, })}>
          <BrandLogoButton />
          <h1>Loader</h1>
        </div>
      </AppTopBar>

      <div className={css({ display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "min-content min-content 1fr min-content min-content", height: "full" })}>
        <StyledFieldset>
          <legend className={cssFieldLabel}>Load Method</legend>
          <div
            className={css({ display: "flex", gap: 2, flexWrap: "wrap", })}
          >
            {[
              { value: "base64", label: "Load Base64" },
              { value: "url", label: "Load URL" },
              { value: "html", label: "Parse HTML" },
            ].map(({ value, label }) => (
              <RadioButton
                key={value}
                name="loadMethod"
                value={value}
                checked={value === mode}
                onChange={({ currentTarget }) => {
                  const newValue = currentTarget.value as UseAnyLoaderMode;
                  onModeChange(newValue);
                }}
              >{label}</RadioButton>
            ))}
          </div>
        </StyledFieldset>

        <StyledFieldLabel className={cssFieldLabel}>Input</StyledFieldLabel>
        <Editor
          value={value}
          onValueChange={onValueChange}
          {...editorConfig}
        />

        <StyledFieldLabel className={cssFieldLabel}>Output</StyledFieldLabel>
        {
          mode === "base64"
            ? <LoaderOutputViewBase64 value={value} />
            : mode === "html"
              ? <LoaderOutputViewHtml value={value} />
              : <LoaderOutputViewUrl value={value} />
        }
      </div>
    </div>
  )
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FromAnyLoader />
  </StrictMode>
);

const cssFieldLabel = css({
  fontWeight: "bold"
});

const StyledFieldset = styled("fieldset", {
  base: {
    display: "grid",
    padding: 4,
    "& > legend": {
      display: "inline-block",
    }
  }
});

const StyledFieldLabel = styled("label", {
  base: {
    padding: 4,
  },
});
