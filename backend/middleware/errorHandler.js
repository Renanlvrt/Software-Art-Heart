/**
 * Global Error Handler Middleware
 * 
 * Catches all unhandled errors and returns consistent JSON responses.
 * Logs errors for debugging while hiding sensitive details in production.
 * 
 * @module middleware/errorHandler
 */

/**
 * Express error handling middleware
 * @param {Error} err - The error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Next middleware function
 */
function errorHandler(err, req, res, next) {
    // Log error for debugging
    console.error('[Error]', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build response
    const response = {
        error: err.name || 'Error',
        message: err.message || 'An unexpected error occurred',
        code: err.code || 'INTERNAL_ERROR'
    };

    // Add details in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.path = req.path;
        response.method = req.method;
    }

    res.status(statusCode).json(response);
}

module.exports = errorHandler;
