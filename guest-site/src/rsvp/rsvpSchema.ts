import type { RSVPField, RSVPForm, RSVPAnswer } from './types';

export type ValidationIssue = { field: string; message: string };

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDraftAnswer(
  form: RSVPForm,
  draft: RSVPAnswer,
  validators: {
    required: string;
    email: string;
    guestCount: string;
    maxGuestCount: string;
  }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const has = (f: RSVPField) => form.activeFields.includes(f);

  if (has('firstname') && !draft.firstname?.trim()) {
    issues.push({ field: 'firstname', message: validators.required });
  }
  if (has('lastname') && !draft.lastname?.trim()) {
    issues.push({ field: 'lastname', message: validators.required });
  }
  if (has('email')) {
    const e = draft.email?.trim();
    if (!e) issues.push({ field: 'email', message: validators.required });
    else if (!EMAIL_RX.test(e)) issues.push({ field: 'email', message: validators.email });
  }
  if (has('phone') && !draft.phone?.trim()) {
    issues.push({ field: 'phone', message: validators.required });
  }
  if (has('message') && !draft.message?.trim()) {
    issues.push({ field: 'message', message: validators.required });
  }

  for (const ev of form.events.filter((e) => e.enabled && (e.askAttendance || e.askGuestCount))) {
    const a = draft.events[ev.id];
    if (ev.askAttendance) {
      if (!a || typeof a.attending !== 'boolean') {
        issues.push({ field: `event:${ev.id}`, message: validators.required });
      }
    }

    const needGuests = ev.askGuestCount && (!ev.askAttendance || a?.attending === true);
    if (!needGuests) continue;
    const n = a?.guestCount;
    if (n == null || Number.isNaN(Number(n)) || Number(n) < 1) {
      issues.push({ field: `eventCount:${ev.id}`, message: validators.guestCount });
      continue;
    }
    if (ev.maxGuests != null && Number(n) > ev.maxGuests) {
      issues.push({ field: `eventCount:${ev.id}`, message: validators.maxGuestCount });
    }
  }

  return issues;
}
