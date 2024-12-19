import { twMerge } from "tailwind-merge";

/**
 * className
 */
export const cn = (p: { className?: string }, ...args: string[]) => {
  return twMerge(p.className, ...args);
};

/**
 * className and props
 */
export const withCn = <T extends { className?: string }>(
  p: T,
  ...classLists: string[]
) => {
  return {
    ...p,
    className: cn(p, ...classLists),
  };
};
