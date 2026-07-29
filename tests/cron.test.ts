import assert from 'node:assert/strict'
import test from 'node:test'
import { isAuthorizedCronRequest } from '../lib/cron'

test('accepts the exact cron bearer secret', () => {
  assert.equal(isAuthorizedCronRequest('Bearer scheduled-secret', 'scheduled-secret'), true)
})

test('rejects missing, malformed, and incorrect cron secrets', () => {
  assert.equal(isAuthorizedCronRequest(null, 'scheduled-secret'), false)
  assert.equal(isAuthorizedCronRequest('Basic scheduled-secret', 'scheduled-secret'), false)
  assert.equal(isAuthorizedCronRequest('Bearer wrong-secret', 'scheduled-secret'), false)
  assert.equal(isAuthorizedCronRequest('Bearer scheduled-secret', undefined), false)
})
