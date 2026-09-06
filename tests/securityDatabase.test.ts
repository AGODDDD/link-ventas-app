import assert from 'node:assert/strict'
import test from 'node:test'
import { securityDatabase } from './support/securityDatabase'

test('migrations and tenant boundaries execute in PostgreSQL', async (t) => {
  const db = await securityDatabase()
  t.after(() => db.close())
  const ownerA = '00000000-0000-4000-8000-000000000001'
  const ownerB = '00000000-0000-4000-8000-000000000002'
  await db.query(`INSERT INTO auth.users(id,email) VALUES ($1,'a@example.test'),($2,'b@example.test')`, [ownerA,ownerB])
  const stores = await db.query<{id:string;owner_id:string}>('SELECT id,owner_id FROM public.stores ORDER BY owner_id')
  const [storeA,storeB] = stores.rows.map(row=>row.id)
  const product = '00000000-0000-4000-8000-000000000010'
  const moda = '00000000-0000-4000-8000-000000000011'
  await db.query(`INSERT INTO public.products(id,user_id,name,price,stock) VALUES ($1,$2,'Normal',10,5),($3,$2,'Moda',20,10)`,[product,storeA,moda])
  await db.query(`INSERT INTO public.product_variants(store_id,product_id,name,value,talla,color,combination_key,stock) VALUES ($1,$2,'M rojo','M','M','rojo','m|rojo',0)`,[storeA,moda])
  async function asRole<T>(role: string, uid: string | null, sql: string, values: unknown[] = []) {
    await db.exec(`BEGIN; SET LOCAL ROLE ${role};`)
    try {
      await db.query(`SELECT set_config('request.jwt.claims',$1,true)`,[JSON.stringify({sub:uid,role})])
      return await db.query<T>(sql, values)
    } finally { await db.exec('ROLLBACK') }
  }
  const orderSql = `SELECT * FROM public.create_order_from_cart($1,'standard',$2,'Comprador','999999999','buyer@example.test','Calle Prueba 123',NULL,NULL,NULL,$3::jsonb,NULL)`
  async function order(lines: unknown[], method = 'whatsapp') {
    return db.query<{order_id:string;total:string}>(orderSql,[storeA,method,JSON.stringify(lines)])
  }

  await t.test('all application tables have RLS; private RPCs deny public execution', async()=>{
    assert.deepEqual((await db.query(`SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity`)).rows,[])
    for (const role of ['anon','authenticated']) {
      await assert.rejects(asRole(role,ownerB,orderSql,[storeA,'whatsapp',JSON.stringify([{product_id:product,quantity:1}])]),/permission denied/)
      await assert.rejects(asRole(role,ownerB,'SELECT public.expire_order_reservations(NULL)'),/permission denied/)
      await assert.rejects(asRole(role,ownerB,`SELECT public.reserve_payment_proof_upload($1,'fake')`,[storeA]),/permission denied/)
    }
  })
  await t.test('colors reject markup in SQL, including direct authenticated updates', async()=>{
    await assert.rejects(asRole('authenticated',ownerA,`UPDATE public.store_config SET primary_color=$1 WHERE store_id=$2`,['</style><script>alert(1)</script>',storeA]),/check constraint/)
    const result = await asRole('authenticated',ownerB,`UPDATE public.store_config SET primary_color='#112233' WHERE store_id=$1 RETURNING store_id`,[storeA])
    assert.equal(result.rows.length,0)
    assert.equal((await asRole('authenticated',ownerA,`UPDATE public.store_config SET primary_color='#112233' WHERE store_id=$1 RETURNING store_id`,[storeA])).rows.length,1)
  })
  await t.test('variant omission and out-of-stock variants fail',async()=>{
    await assert.rejects(order([{product_id:moda,quantity:1}]),/talla y color/)
    await assert.rejects(order([{product_id:moda,quantity:1,variant_details:{talla:'M',color:'rojo'}}]),/Stock insuficiente/)
    await db.query(`UPDATE public.product_variants SET stock=2 WHERE product_id=$1`,[moda])
    assert.equal((await order([{product_id:moda,quantity:1,variant_details:{talla:'M',color:'rojo'}}])).rows[0].total,'20.00')
  })
  await t.test('required options, duplicate IDs and forged display data',async()=>{
    const variants=[{id:'sauce',required:true,min_selections:1,max_selections:1,options:[{id:'extra',name:'Extra',price_modifier:2}]}]
    await db.query('UPDATE public.products SET variants=$1::jsonb WHERE id=$2',[JSON.stringify(variants),product])
    await assert.rejects(order([{product_id:product,quantity:1}]),/Cantidad de opciones/)
    await assert.rejects(order([{product_id:product,quantity:1,variant_details:{options:{sauce:['unknown']}}}]),/Opcion desconocida/)
    await assert.rejects(order([{product_id:product,quantity:1,variant_details:{options:{sauce:['extra','extra']}}}]),/Cantidad de opciones|duplicadas/)
    const valid = await order([{product_id:product,quantity:1,price:0,variant_details:{options:{sauce:['extra']},items:[{price:-999}],notes:'Sin sal'}}])
    assert.equal(valid.rows[0].total,'12.00')
    const line = await db.query<{modifiers:Record<string,unknown>}>('SELECT modifiers FROM public.order_items WHERE order_id=$1',[valid.rows[0].order_id])
    assert.equal(line.rows[0].modifiers.items,undefined)
    assert.equal(line.rows[0].modifiers.notes,'Sin sal')
    await db.query('UPDATE public.products SET variants=$1::jsonb WHERE id=$2',['[]',product])
  })
  await t.test('duplicate lines cannot over-reserve and valid orders retain server prices',async()=>{
    await assert.rejects(order([{product_id:product,quantity:3},{product_id:product,quantity:3}]),/Stock insuficiente/)
    const result = await order([{product_id:product,quantity:1},{product_id:product,quantity:1}])
    assert.equal(result.rows[0].total,'20.00')
    const reservations=await db.query<{quantity:number}>('SELECT quantity FROM public.order_inventory_reservations WHERE order_id=$1',[result.rows[0].order_id])
    assert.deepEqual(reservations.rows,[{quantity:2}])
    assert.equal((await asRole('authenticated',ownerB,'SELECT id FROM public.orders')).rows.length,0)
    assert.ok((await asRole('authenticated',ownerA,'SELECT id FROM public.orders')).rows.length>0)
    await assert.rejects(asRole('authenticated',ownerB,`SELECT * FROM public.transition_order_status($1,'en_preparacion')`,[result.rows[0].order_id]),/No autorizado/)
    const accepted=await asRole<{status:string}>('authenticated',ownerA,`SELECT * FROM public.transition_order_status($1,'en_preparacion')`,[result.rows[0].order_id])
    assert.equal(accepted.rows[0].status,'en_preparacion')
  })
  await t.test('expired unpaid reservations release and cannot be accepted directly',async()=>{
    await db.exec(`UPDATE public.orders SET reservation_expires_at=now()-interval '1 minute' WHERE inventory_committed_at IS NULL`)
    const id=(await db.query<{id:string}>('SELECT id FROM public.orders LIMIT 1')).rows[0].id
    await assert.rejects(asRole('authenticated',ownerA,`SELECT * FROM public.transition_order_status($1,'en_preparacion')`,[id]),/Reserva vencida/)
    await db.query('SELECT public.expire_order_reservations($1)',[storeA])
    assert.equal((await db.query('SELECT id FROM public.order_inventory_reservations WHERE committed_at IS NULL AND released_at IS NULL')).rows.length,0)
    assert.equal((await order([{product_id:product,quantity:5}])).rows[0].total,'50.00')
  })
  await t.test('storage denies other folders, suspension and uploads above the account quota',async()=>{
    const insert=`INSERT INTO storage.objects(bucket_id,name) VALUES ('productos',$1)`
    await assert.rejects(asRole('authenticated',ownerB,insert,[`${ownerA}/other.webp`]),/row-level security/)
    await asRole('authenticated',ownerA,insert,[`${ownerA}/valid.webp`])
    await db.query(`INSERT INTO storage.objects(bucket_id,name) SELECT 'productos',$1 || '/' || n || '.webp' FROM generate_series(1,20) n`,[ownerA])
    await assert.rejects(asRole('authenticated',ownerA,insert,[`${ownerA}/over.webp`]),/row-level security/)
    await asRole('authenticated',ownerA,`UPDATE storage.objects SET metadata='{}' WHERE name=$1`,[`${ownerA}/1.webp`])
    await db.query('UPDATE public.stores SET is_active=false WHERE id=$1',[storeB])
    await assert.rejects(asRole('authenticated',ownerB,insert,[`${ownerB}/suspended.webp`]),/row-level security/)
  })
  await t.test('proofs must exist and can be claimed only once',async()=>{
    await db.query('UPDATE public.products SET stock=100 WHERE id=$1',[product])
    const path=`${storeA}/00000000-0000-4000-8000-000000000099.webp`
    const proofSql=orderSql.replace('::jsonb,NULL)', '::jsonb,$4)')
    const args=[storeA,'transferencia',JSON.stringify([{product_id:product,quantity:1}]),path]
    await assert.rejects(db.query(proofSql,args),/Comprobante no disponible/)
    await db.query('SELECT public.reserve_payment_proof_upload($1,$2)',[storeA,path])
    await assert.rejects(db.query(proofSql,args),/Comprobante no disponible/)
    await db.query(`INSERT INTO storage.objects(bucket_id,name) VALUES ('comprobantes',$1)`,[path])
    await db.query(proofSql,args)
    await assert.rejects(db.query(proofSql,args),/Comprobante no disponible/)
    assert.equal((await asRole('authenticated',ownerB,`SELECT name FROM storage.objects WHERE bucket_id='comprobantes'`)).rows.length,0)
  })
  await t.test('webhook delivery claims prevent duplicates and allow failed/stale retries',async()=>{
    const claim = (token:string) => db.query<{claim_webhook_delivery:string}>('SELECT public.claim_webhook_delivery($1,$2)',['delivery',token])
    assert.equal((await claim(ownerA)).rows[0].claim_webhook_delivery,'claimed')
    assert.equal((await claim(ownerB)).rows[0].claim_webhook_delivery,'busy')
    await db.exec(`UPDATE public.webhook_deliveries SET claimed_at=now()-interval '3 minutes'`)
    assert.equal((await claim(ownerB)).rows[0].claim_webhook_delivery,'claimed')
    const stale=await db.query(`UPDATE public.webhook_deliveries SET completed_at=now() WHERE claim_token=$1 RETURNING delivery_key`,[ownerA])
    assert.equal(stale.rows.length,0)
    await db.query(`UPDATE public.webhook_deliveries SET completed_at=now() WHERE claim_token=$1`,[ownerB])
    assert.equal((await claim(ownerA)).rows[0].claim_webhook_delivery,'done')
    await assert.rejects(asRole('authenticated',ownerA,'SELECT public.claim_webhook_delivery($1,$2)',['other',ownerA]),/permission denied/)
    await db.query('SELECT * FROM public.run_background_maintenance()')
  })
  await t.test('approved payment commits inventory only once',async()=>{
    const result=await order([{product_id:product,quantity:1}],'mercadopago')
    const before=(await db.query<{stock:number}>('SELECT stock FROM public.products WHERE id=$1',[product])).rows[0].stock
    await db.query(`SELECT public.confirm_mercadopago_order_payment($1,'local-test-charge',now())`,[result.rows[0].order_id])
    await db.query(`SELECT public.confirm_mercadopago_order_payment($1,'local-test-charge',now())`,[result.rows[0].order_id])
    assert.equal((await db.query<{stock:number}>('SELECT stock FROM public.products WHERE id=$1',[product])).rows[0].stock,before-1)
  })
})
