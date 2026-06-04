import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { formatAttendanceLead, rsvpStrings } from './rsvpI18n';

import type { RSVPForm } from './types';

import type { RSVPAnswer } from './types';

import { validateDraftAnswer } from './rsvpSchema';

import { submitRSVPAnswer } from './rsvpService';

import { useWeddingTheme } from './useWeddingTheme';

import type { WeddingSite } from '../wedding-sites/types';

export function WeddingRSVPForm({
  site,
  form,
  preview = false,
  slugHint,
}: {
  site: WeddingSite;
  form: RSVPForm;
  preview?: boolean;
  slugHint?: string;
}) {
  const ui = useWeddingTheme(site, form);
  const lang = site.language;
  const S = useMemo(() => rsvpStrings(lang), [lang]);
  const settings = normalizeSettings(form);

  const [draft, setDraft] = useState<RSVPAnswer>({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    dietaryRestrictions: '',
    dietarySelections: [],
    dietaryOther: '',
    drinkPreference: '',
    events: {},
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function setAttendance(eventId: string, attending: boolean) {
    setDraft((d) => {
      const prev = d.events[eventId];
      const nextEv = {
        ...(prev ?? {}),
        attending,
      };
      if (!attending) {
        delete nextEv.guestCount;
      }
      return { ...d, events: { ...d.events, [eventId]: nextEv as RSVPAnswer['events'][string] } };
    });
  }

  function setGuests(eventId: string, n: string) {
    const val = Number(n);
    setDraft((d) => ({
      ...d,
      events: {
        ...d.events,
        [eventId]: {
          ...d.events[eventId],
          guestCount: Number.isFinite(val) ? val : undefined,
        },
      },
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (preview) return;
    const issues = validateDraftAnswer(form, draft, {
      required: S.validationRequired,
      email: S.validationEmail,
      guestCount: S.validationGuestCount,
      maxGuestCount: S.validationMaxGuests,
    });
    if (issues.length) {
      const map: Record<string, string> = {};
      issues.forEach((it) => {
        map[it.field] = it.message;
      });
      setErrors(map);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await submitRSVPAnswer(slugHint ?? site.slug, form.id, draft);
      setSuccess(true);
    } catch {
      setErrors({ _: 'Une erreur est survenue.' });
    } finally {
      setSubmitting(false);
    }
  }

  const rtl = lang === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const textAlign = rtl ? ('right' as const) : ('left' as const);

  function fieldEr(key: string) {
    const m = errors[key];
    return m ? <span style={{ color: '#fecaca', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{m}</span> : null;
  }

  if (success) {
    return (
      <main dir={dir} style={ui.page}>
        <div style={{ ...ui.card, ...successCardPulse }} className="rsvp-success-pop">
          <p style={{ ...ui.heading }}>RSVP</p>
          <h1 style={ui.titleMain}>{S.successTitle}</h1>
          <p style={{ margin: '0.5rem 0 0', opacity: 0.9, lineHeight: 1.6 }}>
            {form.thankYouText?.trim() || S.successBody}
          </p>
          <Link
            to={`/wedding/${site.slug}`}
            style={{
              ...ui.submitBtn,
              display: 'block',
              textAlign: 'center',
              marginTop: 16,
              textDecoration: 'none',
              lineHeight: 1,
            }}
          >
            RETOUR AU SITE
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir={dir} style={ui.page}>
      <div style={{ maxWidth: 560, margin: '0 auto 1rem', textAlign: rtl ? 'right' : 'left' }}>
        <Link style={{ fontSize: '0.92rem', color: ui.secondaryColor }} to={`/wedding/${site.slug}`}>
          ← Site du mariage
        </Link>
      </div>
      <form onSubmit={handleSubmit} style={ui.card}>
        <p style={{ ...ui.heading, textAlign }}>{coupleEyebrow(site)}</p>
        <h1 style={{ ...ui.titleMain, textAlign }}>{form.title?.trim() || S.pageTitle}</h1>
        <p style={{ ...subtitle, color: ui.primaryColor + 'cc', textAlign }}>
          {form.introText?.trim() || S.subtitle}
        </p>

        {form.activeFields.includes('firstname') ? (
          <label style={{ ...ui.label, textAlign }}>
            {S.fieldFirstname}
            <input
              disabled={preview}
              style={{ ...ui.inputBase, direction: rtl ? 'rtl' : undefined }}
              value={draft.firstname}
              onChange={(e) => setDraft({ ...draft, firstname: e.target.value })}
            />
            {fieldEr('firstname')}
          </label>
        ) : null}

        {form.activeFields.includes('lastname') ? (
          <label style={{ ...ui.label, textAlign, marginTop: 12 }}>
            {S.fieldLastname}
            <input
              disabled={preview}
              style={{ ...ui.inputBase, direction: rtl ? 'rtl' : undefined }}
              value={draft.lastname}
              onChange={(e) => setDraft({ ...draft, lastname: e.target.value })}
            />
            {fieldEr('lastname')}
          </label>
        ) : null}

        {form.activeFields.includes('email') ? (
          <label style={{ ...ui.label, textAlign, marginTop: 12 }}>
            {S.fieldEmail}
            <input
              disabled={preview}
              type="email"
              style={{ ...ui.inputBase }}
              dir="ltr"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
            {fieldEr('email')}
          </label>
        ) : null}

        {form.activeFields.includes('phone') ? (
          <label style={{ ...ui.label, textAlign, marginTop: 12 }}>
            {S.fieldPhone}
            <input
              disabled={preview}
              type="tel"
              dir="ltr"
              style={{ ...ui.inputBase }}
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            {fieldEr('phone')}
          </label>
        ) : null}

        {form.activeFields.includes('dietaryRestrictions') && settings.enableDietaryOptions ? (
          <label style={{ ...ui.label, textAlign, marginTop: 12 }}>
            {S.fieldDietary}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {(settings.dietaryOptions ?? []).map((opt) => {
                const selected = (draft.dietarySelections ?? []).includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={preview}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        dietarySelections: selected
                          ? (d.dietarySelections ?? []).filter((x) => x !== opt)
                          : [...(d.dietarySelections ?? []), opt],
                      }))
                    }
                    style={pillBtn(ui, selected)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {settings.showDietaryOther ? (
              <input
                disabled={preview}
                style={{ ...ui.inputBase, marginTop: 8 }}
                value={draft.dietaryOther ?? ''}
                onChange={(e) => setDraft({ ...draft, dietaryOther: e.target.value })}
                placeholder={S.dietaryOtherLabel}
              />
            ) : null}
          </label>
        ) : null}

        {form.events.filter((ev) => ev.enabled).length > 0 ? (
          <div style={{ marginTop: '1.25rem', borderTop: `1px solid ${ui.primaryColor}33`, paddingTop: '1rem' }}>
            <p style={{ ...ui.heading, textAlign }}>{S.sectionEvents}</p>
            {form.events
              .filter((ev) => ev.enabled && (ev.askAttendance || ev.askGuestCount))
              .map((ev) => {
                const a = draft.events[ev.id];
                const attending = a?.attending;

                const attendanceLegend = formatAttendanceLead(S.attendanceLead, ev.label);

                return (
                  <fieldset key={ev.id} style={{ border: 'none', margin: '0 0 1.1rem', padding: 0 }}>
                    <legend style={{ ...ui.label, marginBottom: 8, fontSize: '0.93rem', textAlign }}>
                      {ev.askAttendance ? attendanceLegend : ev.label}
                    </legend>
                    {ev.askAttendance ? (
                      <div
                        role="radiogroup"
                        style={{
                          ...radioRow,
                          flexDirection: rtl ? 'row-reverse' : 'row',
                          justifyContent: rtl ? 'flex-start' : 'flex-start',
                        }}
                      >
                        <label style={radioLab}>
                          <input
                            type="radio"
                            disabled={preview}
                            name={`att-${ev.id}`}
                            checked={attending === true}
                            onChange={() => setAttendance(ev.id, true)}
                          />
                          <span>{S.attendanceYes}</span>
                        </label>
                        <label style={radioLab}>
                          <input
                            type="radio"
                            disabled={preview}
                            name={`att-${ev.id}`}
                            checked={attending === false}
                            onChange={() => setAttendance(ev.id, false)}
                          />
                          <span>{S.attendanceNo}</span>
                        </label>
                      </div>
                    ) : null}
                    {fieldEr(`event:${ev.id}`)}

                    {ev.askGuestCount && (!ev.askAttendance || attending === true) ? (
                      <label style={{ ...ui.label, textAlign, marginTop: 10 }}>
                        {S.guestCountLabel}
                        <input
                          disabled={preview}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          dir="ltr"
                          placeholder={S.guestCountPlaceholder}
                          style={{ ...ui.inputBase }}
                          value={a?.guestCount ?? ''}
                          onChange={(e) => setGuests(ev.id, e.target.value)}
                        />
                        {fieldEr(`eventCount:${ev.id}`)}
                      </label>
                    ) : null}
                  </fieldset>
                );
              })}
          </div>
        ) : null}

        {settings.showDrinkPreference ? (
          <label style={{ ...ui.label, textAlign, marginTop: 12 }}>
            {S.drinkLabel}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {(settings.drinkOptions ?? []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={preview}
                  onClick={() => setDraft((d) => ({ ...d, drinkPreference: d.drinkPreference === opt ? '' : opt }))}
                  style={pillBtn(ui, draft.drinkPreference === opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </label>
        ) : null}

        {form.activeFields.includes('message') && settings.showMessage ? (
          <label style={{ ...ui.label, textAlign, marginTop: 12 }}>
            {S.fieldMessage}
            <textarea
              disabled={preview}
              rows={3}
              style={{ ...ui.inputBase, minHeight: 88, resize: 'vertical', lineHeight: 1.5 }}
              value={draft.message}
              onInput={(ev) => {
                const ta = ev.currentTarget;
                ta.style.height = 'auto';
                ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 88), 360)}px`;
              }}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            />
            {fieldEr('message')}
          </label>
        ) : null}

        {errors._ ? <p style={{ color: '#fca5a5', fontSize: '0.88rem' }}>{errors._}</p> : null}

        {preview ? (
          <p style={{ opacity: 0.55, marginTop: 14, fontSize: '0.85rem', textAlign: 'center' }}> MODE APERÇU </p>
        ) : (
          <button type="submit" disabled={submitting} style={{ ...ui.submitBtn, opacity: submitting ? 0.75 : 1 }}>
            {submitting ? S.submittingLabel : S.submitLabel}
          </button>
        )}
      </form>
    </main>
  );
}

function coupleEyebrow(site: WeddingSite) {
  return `${site.brideName} · ${site.groomName}`;
}

const subtitle: CSSProperties = {
  margin: '0 0 1.25rem',
  fontSize: '0.94rem',
  lineHeight: 1.55,
};

const radioRow: CSSProperties = { display: 'flex', gap: 16 };

const radioLab: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, cursor: 'pointer' };

const successCardPulse: CSSProperties = {
  textAlign: 'center',
};

function pillBtn(ui: ReturnType<typeof useWeddingTheme>, active: boolean): CSSProperties {
  return {
    border: `1px solid ${ui.primaryColor}${active ? '' : '55'}`,
    borderRadius: 999,
    padding: '0.42rem 0.75rem',
    background: active ? `${ui.secondaryColor}55` : '#fff',
    color: ui.textColor,
    fontWeight: 650,
    cursor: 'pointer',
  };
}

function normalizeSettings(form: RSVPForm) {
  return {
    showDrinkPreference: form.settings?.showDrinkPreference ?? true,
    drinkOptions: form.settings?.drinkOptions ?? ['Whisky', 'Vodka', 'Gin', 'Ricard', 'Vin', 'Boukha'],
    showMessage: form.settings?.showMessage ?? true,
    enableDietaryOptions: form.settings?.enableDietaryOptions ?? true,
    dietaryOptions: form.settings?.dietaryOptions ?? ['Végétarien', 'Vegan', 'Sans gluten', 'Halal', 'Kasher'],
    showDietaryOther: form.settings?.showDietaryOther ?? true,
  };
}
