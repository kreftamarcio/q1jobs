'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeJob } = require('../src/lib/normalizeJob');

test('aceita payload no formato remoteok', () => {
  const result = normalizeJob({
    external_id: ' 42 ',
    source: 'RemoteOK',
    title: '  Staff Engineer ',
    description: 'Build APIs',
    company_name: 'Acme',
    logo_url: 'https://example.com/logo.png',
    location: 'Remote',
    job_type: 'full-time',
    salary_min: '100000',
    salary_max: '140000',
    salary_currency: 'USD',
    category: 'Technology',
    tags: ['js', ' '],
    apply_url: 'https://remoteok.com/l/42',
    published_at: '2026-01-15T00:00:00.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.job.external_id, '42');
  assert.equal(result.job.source, 'remoteok');
  assert.equal(result.job.title, 'Staff Engineer');
  assert.equal(result.job.location_type, 'remote');
  assert.equal(result.job.salary_min, 100000);
  assert.deepEqual(result.job.tags, ['js']);
  assert.equal(result.job.published_at, '2026-01-15T00:00:00.000Z');
});

test('rejeita sem source, external_id ou title', () => {
  assert.equal(normalizeJob({}).ok, false);
  assert.equal(normalizeJob({ source: 'x', title: 'y' }).error, 'missing_external_id');
  assert.equal(normalizeJob({ source: 'x', external_id: '1' }).error, 'missing_title');
});

test('nao inventa published_at', () => {
  const result = normalizeJob({
    source: 'jooble',
    external_id: '-2804824990161953300',
    title: 'Korean Content Writer for AI Training',
    company_name: 'SaidGig',
    location: 'Remote',
  });
  assert.equal(result.ok, true);
  assert.equal(result.job.published_at, null);
  assert.equal(result.job.apply_url, null);
});
