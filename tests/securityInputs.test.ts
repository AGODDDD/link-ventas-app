import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { storeColor } from '../lib/storeColors'
import { jsonToCSV } from '../lib/csvUtils'
import { boundedBody, boundedJson } from '../lib/requestBody'
import { normalizePaymentProof } from '../lib/paymentProof'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

test('malicious colors never leave the style element',()=>{
  const color=storeColor('</style><script>window.pwned=true</script><style>')
  const html=renderToStaticMarkup(React.createElement('style',null,`:root { --primary-color: ${color}; }`))
  assert.equal(html.includes('<script>'),false)
  assert.equal(storeColor('#AABBCC'),'#AABBCC')
})
test('storefront nonces rotate while the existing dashboard session gate is preserved',()=>{
  const first=proxy(new NextRequest('http://localhost/tienda/test'))
  const second=proxy(new NextRequest('http://localhost/tienda/test'))
  assert.notEqual(first.headers.get('Content-Security-Policy'),second.headers.get('Content-Security-Policy'))
  assert.match(first.headers.get('Content-Security-Policy') || '',/strict-dynamic/)
  assert.equal(proxy(new NextRequest('http://localhost/dashboard')).headers.get('location'),'http://localhost/login')
})
test('exported user strings are neutralized while numeric values remain numeric',()=>{
  for (const value of ['=1+1','+1','-1','@SUM(1)','\t=1','  =1']) assert.ok(jsonToCSV([{Cliente:value}]).split('\n')[1].startsWith("'"))
  assert.equal(jsonToCSV([{value:-2}]),'value\n-2')
})
test('body limits apply without content length and reject invalid JSON',async()=>{
  await assert.rejects(boundedBody(new Request('http://localhost',{method:'POST',body:'12345'}),4),{status:413})
  await assert.rejects(boundedJson(new Request('http://localhost',{method:'POST',body:'null'})),{status:400})
  assert.deepEqual(await boundedJson(new Request('http://localhost',{method:'POST',body:'{"ok":true}'})),{ok:true})
})
test('proof decoding rejects spoofed images and strips metadata through re-encoding',async()=>{
  await assert.rejects(normalizePaymentProof(new File(['<script>alert(1)</script>'],'fake.jpg',{type:'image/jpeg'})),{status:400})
  const bytes=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer()
  const result=await normalizePaymentProof(new File([bytes],'proof.png',{type:'image/png'}))
  const metadata=await sharp(result).metadata()
  assert.equal(metadata.format,'webp')
  assert.equal(metadata.exif,undefined)
})
