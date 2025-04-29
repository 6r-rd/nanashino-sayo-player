// Global swipe detection state
let isSwipeListenerActive = false;
let swipeCallback: (() => void) | null = null;

// Register a callback for swipe detection
export function registerSwipeCallback(callback: () => void): () => void {
  // If there's already a callback registered, replace it
  swipeCallback = callback;
  
  // If the listener is not active yet, set it up
  if (!isSwipeListenerActive) {
    setupSwipeListener();
  }
  
  // Return a function to unregister the callback
  return () => {
    swipeCallback = null;
  };
}

// Set up the global swipe listener
function setupSwipeListener() {
  if (typeof window === 'undefined') return;
  
  let touchStartX: number | null = null;
  
  const handleTouchStart = (e: TouchEvent) => {
    // Only detect touches near the left edge (20% of screen width)
    if (e.touches[0].clientX < window.innerWidth * 0.2) {
      touchStartX = e.touches[0].clientX;
    }
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    
    // If swiped right more than 50px, trigger the callback
    if (diff > 50 && swipeCallback) {
      swipeCallback();
    }
    
    touchStartX = null;
  };
  
  document.addEventListener('touchstart', handleTouchStart);
  document.addEventListener('touchend', handleTouchEnd);
  
  isSwipeListenerActive = true;
}
