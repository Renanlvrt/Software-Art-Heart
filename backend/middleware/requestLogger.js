/**
 * Request Logger Middleware
 * 
 * Logs all incoming HTTP requests for debugging and monitoring.
 * 
 * @module middleware/requestLogger
 */

/**
 * Express request logging middleware
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Next middleware function
 */
function requestLogger(req, res, next) {
    const start = Date.now();

    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';

        console.log(
            `[${logLevel}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
        );
    });

    next();
}

module.exports = requestLogger;
