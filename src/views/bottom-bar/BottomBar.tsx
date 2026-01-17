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
        paddingX: 2,
        display: "grid",
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
