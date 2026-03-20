import { useState, useEffect, useRef } from 'react';

/**
 * Smoothly animate from 0 (or previous value) to the target number.
 * Uses requestAnimationFrame for 60fps buttery smoothness.
 * 
 * @param {number} target - Target number to animate to
 * @param {number} duration - Animation duration in ms (default 800)
 * @returns {number} - The current animated value
 */
export function useAnimatedCounter(target, duration = 800) {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + diff * eased;

      setCurrent(value);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevTarget.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return current;
}
