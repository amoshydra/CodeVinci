import { cx } from '../../styled-system/css/cx'

/**
 * Merge class names with PandaCSS cx utility
 * className
 */
export const cn = (...args: (string | { className?: string } | undefined)[]) => {
  return cx(
    ...args.filter(Boolean).map((arg) => {
      return typeof arg === 'object' ? arg.className : arg
    })
  )
}

/**
 * className and props
 */
export const withCn = <T extends { className?: string }>(
  p: T,
  ...classLists: string[]
) => {
  return {
    ...p,
    className: cn(p.className, ...classLists),
  }
}
