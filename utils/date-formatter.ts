export const formatDateForSupabase = (date: Date | string): string => {
  // If string is passed, convert to Date
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate date
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return new Date().toISOString();
  }
  
  // Return ISO string for Supabase
  return dateObj.toISOString();
};

export const formatDateForDisplay = (date: Date | string): string => {
  // If string is passed, convert to Date
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate date
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return new Date().toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', '').toLowerCase();
  }
  
  // Return formatted date string for display
  return dateObj.toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', '').toLowerCase();
}; 