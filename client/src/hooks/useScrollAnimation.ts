import { useEffect, useRef } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  delay?: number;
}

export function useScrollAnimation<T extends HTMLElement = HTMLElement>(options: UseScrollAnimationOptions = {}) {
  const ref = useRef<T>(null);
  const {
    threshold = 0.2,
    rootMargin = "0px 0px -20% 0px",
    delay = 0
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      element.classList.add('in-view');
      return;
    }

    // Initialize element in hidden state
    element.style.opacity = '0';
    element.style.transform = 'translateY(16px)';
    element.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Apply delay if specified
            setTimeout(() => {
              element.style.opacity = '1';
              element.style.transform = 'translateY(0px)';
              element.classList.add('in-view');
            }, delay);
            
            // Disconnect observer after animation
            observer.unobserve(element);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    // Handle elements already in view on load
    const rect = element.getBoundingClientRect();
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isInView) {
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0px)';
        element.classList.add('in-view');
      }, delay + 100); // Small delay to avoid harsh pop
    } else {
      observer.observe(element);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [threshold, rootMargin, delay]);

  return ref;
}

export function useStaggeredScrollAnimation(count: number, staggerDelay: number = 120) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const observers = useRef<IntersectionObserver[]>([]);
  const timeouts = useRef<NodeJS.Timeout[]>([]);
  const hasUserScrolled = useRef(false);
  const navigationDelay = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    refs.current = refs.current.slice(0, count);
    
    // Reset user scroll tracking on mount
    hasUserScrolled.current = false;
    
    // Track user scrolling to differentiate from programmatic navigation scrolling
    const handleUserScroll = () => {
      hasUserScrolled.current = true;
      window.removeEventListener('scroll', handleUserScroll);
    };
    
    // Wait for navigation scroll to settle before enabling user scroll tracking
    navigationDelay.current = setTimeout(() => {
      window.addEventListener('scroll', handleUserScroll, { passive: true });
    }, 500); // Give time for navigation auto-scroll to complete
    
    // Cleanup function to reset all animations and observers
    return () => {
      // Clear navigation delay timeout
      if (navigationDelay.current) {
        clearTimeout(navigationDelay.current);
        navigationDelay.current = null;
      }
      
      // Remove scroll listener
      window.removeEventListener('scroll', handleUserScroll);
      
      // Clear all timeouts
      timeouts.current.forEach(timeout => clearTimeout(timeout));
      timeouts.current = [];
      
      // Disconnect all observers
      observers.current.forEach(observer => observer.disconnect());
      observers.current = [];
      
      // Reset all elements to initial state
      refs.current.forEach(element => {
        if (element) {
          element.style.opacity = '0';
          element.style.transform = 'translateY(16px)';
          element.classList.remove('in-view');
        }
      });
    };
  }, [count]);

  const createRef = (index: number) => {
    if (!refs.current[index]) {
      refs.current[index] = null;
    }
    
    return (element: HTMLElement | null) => {
      refs.current[index] = element;
      
      if (element) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Always reset element to initial state first
        element.classList.remove('in-view');
        
        if (prefersReducedMotion) {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0px)';
          element.classList.add('in-view');
          return;
        }

        // Initialize element in hidden state
        element.style.opacity = '0';
        element.style.transform = 'translateY(16px)';
        element.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && hasUserScrolled.current) {
                const delay = index * staggerDelay;
                const timeout = setTimeout(() => {
                  if (element) { // Check element still exists
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0px)';
                    element.classList.add('in-view');
                  }
                }, delay);
                
                timeouts.current[index] = timeout;
                observer.unobserve(element);
              }
            });
          },
          {
            threshold: 0.2,
            rootMargin: "0px 0px -20% 0px"
          }
        );

        // Store observer for cleanup
        observers.current[index] = observer;

        // Don't animate elements already in view on page load
        // They will only animate when user scrolls manually
        observer.observe(element);
      }
    };
  };

  return { createRef };
}