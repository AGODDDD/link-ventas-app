import assert from 'node:assert/strict'
import test from 'node:test'
import { csvToJSON, jsonToCSV } from '../../lib/csvUtils'

test('serializa valores CSV con comas y comillas', () => {
  const csv = jsonToCSV([{ name: 'Cafe, molido', note: 'Dice "oferta"' }])
  assert.equal(csv, 'name,note\n"Cafe, molido","Dice ""oferta"""')
})

test('parsea encabezados y valores CSV escapados', () => {
  const rows = csvToJSON('name,note\n"Cafe, molido","Dice ""oferta"""')
  assert.deepEqual(rows, [{ name: 'Cafe, molido', note: 'Dice "oferta"' }])
})
