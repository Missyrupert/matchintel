/**
 * Validates a date string in YYYY-MM-DD format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean}
 */
export function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validates a date range (dateFrom <= dateTo)
 * @param {string} dateFrom - Start date
 * @param {string} dateTo - End date
 * @returns {boolean}
 */
export function isValidDateRange(dateFrom, dateTo) {
  if (!isValidDate(dateFrom) || !isValidDate(dateTo)) return false;
  return new Date(dateFrom) <= new Date(dateTo);
}
