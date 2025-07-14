/**
* A simple, reusable spinner that conveys loading progress. The component is
* deliberately kept DOM-light so it can be composed inside other UI wrappers
* (cards, modals, etc.) without introducing additional layout noise.
*
* Accessibility considerations:
* – `role="status"` informs assistive tech that this region delivers a live
*   status update.
* – `aria-live="polite"` ensures the message is announced without abruptly
*   interrupting the current screen-reader output.
* – The visually-hidden <span> provides a spoken label (“Loading…”) so the
*   spinner is recognizable to non-sighted users.
*/
function LoadingIndicator() {
  return (
    <div
      id="loading-indicator"
      role="status"
      aria-live="polite"
      className="flex justify-center items-center my-4"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600" />
      {/* Screen-reader text */}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default LoadingIndicator;
