'use strict';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function toNumberOrNull(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeJob(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'invalid_input' };
  }

  const source = trimOrEmpty(input.source).toLowerCase();
  const external_id = trimOrEmpty(input.external_id);
  const title = trimOrEmpty(input.title);

  if (!source) return { ok: false, error: 'missing_source' };
  if (!external_id) return { ok: false, error: 'missing_external_id' };
  if (!title) return { ok: false, error: 'missing_title' };

  const location = trimOrEmpty(input.location);
  let location_type = trimOrEmpty(input.location_type).toLowerCase();
  if (!location_type && /^remote$/i.test(location)) {
    location_type = 'remote';
  }

  const tags = Array.isArray(input.tags)
    ? input.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];

  return {
    ok: true,
    job: {
      external_id,
      source,
      title,
      description: trimOrEmpty(input.description),
      company_name: trimOrEmpty(input.company_name),
      logo_url: trimOrEmpty(input.logo_url),
      location,
      location_type: location_type || null,
      job_type: trimOrEmpty(input.job_type) || null,
      salary_min: toNumberOrNull(input.salary_min),
      salary_max: toNumberOrNull(input.salary_max),
      salary_currency: trimOrEmpty(input.salary_currency) || null,
      category: trimOrEmpty(input.category) || null,
      tags,
      apply_url: trimOrEmpty(input.apply_url) || null,
      published_at: toIsoOrNull(input.published_at),
      is_active: input.is_active === false ? false : true,
    },
  };
}

module.exports = { normalizeJob };
