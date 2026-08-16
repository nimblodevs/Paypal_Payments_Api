// ============================================================
// asyncHandler
// Wraps an async Express route/controller so any rejected
// promise (thrown error) is automatically forwarded to next(),
// where our centralized error handler middleware takes over.
// This avoids writing try/catch in every single controller.
// ============================================================

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
