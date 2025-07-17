
import { flushSync } from "react-dom";

/**
 * A Navigate function that supports view-transitions
 */
export type NavigateFunction = (
  to: string,
  options?: {
    replace?: boolean;
    state?: unknown;
  }
) => void;

/**
 * Wraps a navigation function with view-transition logic
 *
 * @param {(...args: any) => any} navigate The navigation function to wrap
 * @returns {NavigateFunction} A navigation function that supports view-transitions
 */
export const wrapNavigate = (
  navigate: (...args: unknown[]) => void
): NavigateFunction => {
  return (to, options) => {
    if (!document.startViewTransition) {
      return navigate(to, options);
    }

    document.startViewTransition(() => {
      flushSync(() => {
        navigate(to, options);
      });
    });
  };
};
