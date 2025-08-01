import { useState, useEffect } from 'react';

export type LoadingVariant = 'warm' | 'cool' | 'sunset' | 'mint' | 'golden';

const variants: LoadingVariant[] = ['warm', 'cool', 'sunset', 'mint', 'golden'];

export const useLoadingVariant = (): LoadingVariant => {
  const [variant, setVariant] = useState<LoadingVariant>('warm');

  useEffect(() => {
    // Select a random variant on mount
    const randomIndex = Math.floor(Math.random() * variants.length);
    setVariant(variants[randomIndex]);
  }, []);

  return variant;
};