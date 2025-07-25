import { NavigateFunction } from 'react-router';

export const wrapNavigate = (navigate: NavigateFunction) => {
  return (to: string, direction: 'left' | 'right' | null = null) => {
    if (!document.startViewTransition) {
      navigate(to);
      return;
    }

    document.documentElement.dataset.transitionDirection = direction || '';

    document.startViewTransition(() => {
      navigate(to);
    });
  };
};