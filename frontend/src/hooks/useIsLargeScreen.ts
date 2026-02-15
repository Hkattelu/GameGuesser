import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the screen is at or above the 'lg' breakpoint (1024px)
 * This is useful for conditionally rendering components based on screen size
 * to avoid mounting hidden components that could cause issues.
 */
export function useIsLargeScreen(): boolean {
    const [isLargeScreen, setIsLargeScreen] = useState<boolean>(
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setIsLargeScreen(window.innerWidth >= 1024);
        };

        // Set initial value
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isLargeScreen;
}
