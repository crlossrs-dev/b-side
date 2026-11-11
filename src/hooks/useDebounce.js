import { useState, useEffect } from 'react';

// This hook is used to debounce a value, meaning it will only update the debounced value after a specified delay
// has passed without any new updates to the original value. This is useful for scenarios like search input where you want to wait for the user to stop typing before making an API call.
export function useDebounce(value, delay = 350) { 
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebounced(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debounced;
}