import structuredClone from '@ungap/structured-clone';
import { HTMLAttributes, useCallback, useState } from 'react';
import { css } from '../../../styled-system/css';
import { withCn } from '../../utils/tailwind';
import { Logger } from '../log/Logger';
import { LoggerButton } from '../log/LoggerButton';

export interface BottomBarProps extends HTMLAttributes<HTMLDivElement> {
  logs: { method: string, args: structuredClone.SerializedRecord }[]
  counts: { error: number; warn: number; info: number; other: number }
  onClear: () => void;
}

export const BottomBar = (({ logs, counts, onClear, ...props }: BottomBarProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const toggleLogger = useCallback(() => {
    setDetailsOpen(v => !v);
  }, []);
  return (
    <div
      {...withCn(props, css({
        display: "grid",
        // Insets are additive on top of the original 2-unit (0.5rem) paddingX,
        // so a zero inset reproduces the previous layout exactly. The bottom
        // inset is what keeps the input and button clear of the home indicator
        // and Android gesture bar.
        paddingLeft: 'calc(0.5rem + var(--safe-area-left, 0px))',
        paddingRight: 'calc(0.5rem + var(--safe-area-right, 0px))',
        paddingBottom: 'var(--safe-area-bottom, 0px)',
        gridTemplateAreas: `
          "logger logger"
          "input button"
        `,
        gridTemplateColumns: "1fr min-content",
        gridTemplateRows: "min-content 1fr",
        ...Object.fromEntries(Object.values([
          "input",
          "button",
          "logger",
        ]).map(v => [
          `& > [data-grid-area="${v}"]`,
          { gridArea: v }
        ]))
      }))}
    >
      <input
        data-grid-area="input"
        disabled
        className={css({
          padding: 2,
          width: 'full',
          fontFamily: 'mono',
          fontSize: '1rem',
        })}
        placeholder=''
      />

      <LoggerButton
        logs={logs}
        counts={counts}
        data-grid-area="button"
        onClick={toggleLogger}
      />

      <Logger
        data-grid-area="logger"
        open={detailsOpen}
        logs={logs}
      />
    </div>
  );
});
