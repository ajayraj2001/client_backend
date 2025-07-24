/**
 * Custom Error class for representing API errors with additional information.
 * @class ApiError
 * @extends Error
 * @param {string} message - A descriptive error message.
 * @param {number} statusCode - The HTTP status code associated with the error.
 * @param {Object} data - Additional data or information related to the error.
 * @property {number} statusCode - The HTTP status code associated with the error.
 * @property {Object} data - Additional data or information related to the error.
 * @example
 * throw new ApiError('Not Found', 404, { id: 'abc' });
 */
class ApiError extends Error {
  /**
   * Creates an instance of ApiError.
   * @constructor
   * @param {string} message - A descriptive error message.
   * @param {number} statusCode - The HTTP status code associated with the error.
   * @param {Object} data - Additional data or information related to the error.
   */
  constructor(message, statusCode, data) {
    super(message);
    /**
     * The HTTP status code associated with the error.
     * @type {number}
     */
    this.statusCode = statusCode;

    /**
     * Additional data or information related to the error.
     * @type {Object}
     */
    this.data = data;
  }
}

const finalErrorHandler = (error, req, res, next) => {
  const { message, statusCode = 500, data, stack } = error;

  res.status(statusCode);
  if (statusCode === 500)
    return res.json({ success: false, message, data, stack });
  return res.json({
    success: false,
    message: message || "Internal Server Error!",
    data,
  });
};

module.exports = {
  ApiError,
  finalErrorHandler,
};
