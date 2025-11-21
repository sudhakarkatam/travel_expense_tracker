/**
 * Formats a date string or Date object to show both date and time
 * @param date - Date string (ISO format) or Date object
 * @param options - Formatting options
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: string | Date | any,
  options?: {
    includeTime?: boolean;
    timeFormat?: '12h' | '24h';
    dateFormat?: 'short' | 'long' | 'medium';
  }
): string {
  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date && typeof date.toDate === 'function') {
    // Handle Firestore Timestamp
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const {
    includeTime = true,
    timeFormat = '12h',
    dateFormat = 'short',
  } = options || {};

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: dateFormat === 'long' ? 'long' : dateFormat === 'medium' ? 'short' : 'numeric',
    day: 'numeric',
    year: dateFormat === 'long' || dateFormat === 'medium' ? 'numeric' : undefined,
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  };

  // Use en-IN for DD/MM/YYYY format
  const formattedDate = dateObj.toLocaleDateString('en-IN', dateOptions);

  if (includeTime) {
    const formattedTime = dateObj.toLocaleTimeString('en-IN', timeOptions);
    return `${formattedDate} at ${formattedTime}`;
  }

  return formattedDate;
}

/**
 * Formats a date to show relative time (e.g., "2 hours ago", "Yesterday")
 * Falls back to formatted date if more than 7 days ago
 */
export function formatRelativeDateTime(date: string | Date | any): string {
  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);
  }
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDateTime(dateObj, { includeTime: true });
}

