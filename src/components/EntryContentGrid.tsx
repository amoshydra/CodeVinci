import { styled } from "../../styled-system/jsx";

const tuple = <T extends string>(...v: T[]) => Object.fromEntries(v.map(v => [v, v])) as { [K in T]: K };

export const A = tuple(
  "sidebar",
  "viewer_",
  "editor_",
  "divider",
  "bottom_",
);

export const EntryContentGrid = styled('div', {
  base: {
    display: 'grid',
    minHeight: 0,
    gridTemplateRows: '1fr min-content',
    ...Object.fromEntries(Object.keys(A).map(area => [
      `& > *[data-grid-area="${area}"]`,
      {
        gridArea: area,
      }
    ])),
  },
  variants: {
    mode: {
      edit: {
        gridTemplateAreas: `
          "sidebar editor_"
          "sidebar bottom_"
        `,
      },
      view: {
        gridTemplateRows: '1fr',
        gridTemplateColumns: '1fr',
        gridTemplateAreas: `
          "viewer_"
        `,
      },
      "view-edit": {
        gridTemplateRows: '1fr 0 1fr min-content',
        gridTemplateColumns: 'min-content 1fr min-content 1fr',
        gridTemplateAreas: `
          "sidebar editor_ editor_ editor_"
          "sidebar divider divider divider"
          "sidebar viewer_ viewer_ viewer_"
          "sidebar bottom_ bottom_ bottom_"
        `,
        "@media screen and (orientation: landscape)": {
          gridTemplateAreas: `
            "sidebar editor_ divider viewer_"
            "sidebar editor_ divider viewer_"
            "sidebar editor_ divider viewer_"
            "sidebar bottom_ bottom_ bottom_"
          `,
        },
      },
      external: {},
    },
  }
});
