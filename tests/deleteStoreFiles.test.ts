import test from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deleteStoragePrefix } from '../lib/deleteStoreFiles'

test('deletion removes every page and nested folder while preserving another tenant', async()=>{
  const objects=new Set([...Array.from({length:205},(_,i)=>`owner/file${i}`),'owner/nested/proof','other/keep'])
  const removed: string[]=[]
  const client={storage:{from:()=>({
    list:async(prefix:string,{limit}:{limit:number})=>{
      const entries=new Map<string,{name:string;id:string|null}>()
      for(const object of objects) if(object.startsWith(prefix+'/')) {
        const tail=object.slice(prefix.length+1)
        const name=tail.split('/')[0]
        entries.set(name,{name,id:tail.includes('/')?null:object})
      }
      return {data:[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name)).slice(0,limit),error:null}
    },
    remove:async(paths:string[])=>{paths.forEach(path=>{objects.delete(path);removed.push(path)});return {error:null}},
  })}} as unknown as SupabaseClient
  await deleteStoragePrefix(client,'productos','owner')
  assert.deepEqual([...objects],['other/keep'])
  assert.equal(removed.length,206)
})
test('deletion fails closed on provider errors or unconfirmed deletion',async()=>{
  const client={storage:{from:()=>({list:async()=>({data:[{id:'id',name:'file'}],error:null}),remove:async()=>({error:null})})}} as unknown as SupabaseClient
  await assert.rejects(deleteStoragePrefix(client,'productos','owner'),/not confirmed/)
})
