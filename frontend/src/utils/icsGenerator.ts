import { Task } from '../types/task';
import { format } from 'date-fns';

/**
 * Generates an ICS (iCalendar) file content for a task
 */
export const generateICSContent = (task: Task): string => {
  const now = new Date();
  
  // If no due date, create an event for "now" (Apple Calendar requires a valid date)
  const dueDate = task.due_date ? new Date(task.due_date) : now;
  
  // Format dates for ICS (YYYYMMDDTHHMMSSZ format) - Apple Calendar is strict about this
  const formatICSDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  // Generate unique ID for the event (Apple Calendar prefers domain-style UIDs)
  const uid = `task-${task.id}-${Date.now()}@ollama-todo-app.com`;
  
  // Calculate event duration (1 hour)
  const startDate = dueDate;
  const endDate = new Date(startDate.getTime() + (60 * 60 * 1000));

  // Escape special characters for ICS format (Apple Calendar is strict)
  const escapeICSText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  };

  // Build ICS content with proper line breaks and formatting
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ollama Todo App//Task Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(task.title)}`,
  ];

  // Add optional fields only if they exist
  if (task.description) {
    lines.push(`DESCRIPTION:${escapeICSText(task.description)}`);
  }
  
  if (task.category) {
    lines.push(`CATEGORIES:${escapeICSText(task.category)}`);
  }

  // Add priority (Apple Calendar recognizes 1-9)
  const priority = (() => {
    switch (task.priority?.toUpperCase()) {
      case 'URGENT': return 1;
      case 'HIGH': return 3;
      case 'MEDIUM': return 5;
      case 'LOW': return 7;
      default: return 5;
    }
  })();
  lines.push(`PRIORITY:${priority}`);

  // Add status
  const status = task.status === 'COMPLETED' ? 'COMPLETED' : 'NEEDS-ACTION';
  lines.push(`STATUS:${status}`);

  // Add completion date if completed
  if (task.status === 'COMPLETED') {
    lines.push(`COMPLETED:${formatICSDate(new Date(task.updated_at))}`);
  }

  // Add standard fields
  lines.push('CLASS:PUBLIC');
  lines.push('TRANSP:OPAQUE');

  // Add reminder only if we have a real due date (not generated)
  if (task.due_date) {
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeICSText(task.title)}`);
    lines.push('TRIGGER:-PT15M');
    lines.push('END:VALARM');
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // Join with proper line endings (CRLF is required by RFC 5545)
  return lines.join('\r\n');
};

/**
 * Downloads an ICS file for a task
 */
export const downloadTaskAsICS = (task: Task): void => {
  const icsContent = generateICSContent(task);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = `task-${task.id}-${task.title.replace(/[^a-zA-Z0-9]/g, '-')}.ics`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates ICS content for multiple tasks
 */
export const generateMultipleTasksICS = (tasks: Task[]): string => {
  const now = new Date();
  
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const escapeICSText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  };

  const getICSPriority = (priority: string): number => {
    switch (priority.toUpperCase()) {
      case 'URGENT': return 1;
      case 'HIGH': return 3;
      case 'MEDIUM': return 5;
      case 'LOW': return 7;
      default: return 5;
    }
  };

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ollama Todo App//Tasks Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  tasks.forEach(task => {
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const uid = `task-${task.id}-${Date.now()}@ollama-todo-app.local`;
    const startDate = dueDate || now;
    const endDate = new Date(startDate.getTime() + (60 * 60 * 1000));

    const eventLines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(now)}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${escapeICSText(task.title)}`,
      task.description ? `DESCRIPTION:${escapeICSText(task.description)}` : '',
      task.category ? `CATEGORIES:${escapeICSText(task.category)}` : '',
      `PRIORITY:${getICSPriority(task.priority)}`,
      `STATUS:${task.status === 'COMPLETED' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      task.status === 'COMPLETED' ? `COMPLETED:${formatICSDate(new Date(task.updated_at))}` : '',
      'CLASS:PUBLIC',
      'TRANSP:OPAQUE',
      dueDate ? 'BEGIN:VALARM' : '',
      dueDate ? 'ACTION:DISPLAY' : '',
      dueDate ? `DESCRIPTION:Reminder: ${escapeICSText(task.title)}` : '',
      dueDate ? 'TRIGGER:-PT15M' : '',
      dueDate ? 'END:VALARM' : '',
      'END:VEVENT'
    ].filter(line => line !== '');

    icsContent = icsContent.concat(eventLines);
  });

  icsContent.push('END:VCALENDAR');
  
  return icsContent.join('\r\n');
};

/**
 * Downloads multiple tasks as a single ICS file
 */
export const downloadMultipleTasksAsICS = (tasks: Task[], filename?: string): void => {
  const icsContent = generateMultipleTasksICS(tasks);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = filename || `ollama-todo-tasks-${format(new Date(), 'yyyy-MM-dd')}.ics`;
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};