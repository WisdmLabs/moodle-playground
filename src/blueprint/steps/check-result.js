/**
 * Shared utility for checking PHP execution results from blueprint steps.
 *
 * @param {object} result - The result from php.run()
 * @param {string} stepName - The step name for error messages
 */
export function checkPhpResult(result, stepName) {
  const text = result?.text || "";
  const errors = result?.errors || "";
  if (errors) {
    console.warn(`[blueprint] ${stepName} PHP errors:`, errors);
  }
  if (text?.includes('"ok":false')) {
    throw new Error(
      `${stepName}: PHP returned failure: ${text.substring(0, 500)}`,
    );
  }
  if (!text || !text.includes('"ok"')) {
    const detail = errors
      ? `PHP errors: ${errors.substring(0, 300)}`
      : "empty response";
    throw new Error(
      `${stepName}: PHP script produced no valid output (${detail})`,
    );
  }
}
