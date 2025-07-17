
import { flushSync } from "react-dom";

/**
 * A Navigate function that supports view-transitions
 */
export type NavigateFunction = (
  to: string,
  options?: {
    replace?: boolean;
    state?: any;
  }
) => void;

/**
 * Wraps a navigation function with view-transition logic
 *
 * @param {(...args: any) => any} navigate The navigation function to wrap
 * @returns {NavigateFunction} A navigation function that supports view-transitions
 */
export const wrapNavigate = (
  navigate: (...args: any) => any
): NavigateFunction => {
  return (to, options) => {
    // @ts-ignore
    if (!document.startViewTransition) {
      return navigate(to, options);
    }

    // @ts-ignore
    document.startViewTransition(() => {
      flushSync(() => {
        navigate(to, options);
      });
    });
  };
};
