import assert from 'node:assert/strict';
import {randomBytes, createHash} from 'node:crypto';
import {spawn, execFileSync} from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {hash} from 'bcryptjs';
import {SignJWT} from 'jose';

// Isolated schema: no test accounts or credentials enter the shop database.
const source = new PrismaClient();
const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
const database = 'petshop_remember_audit_' + randomBytes(5).toString('hex');
url.pathname = '/' + database;
const db = new PrismaClient({datasources:{db:{url:url.toString()}}});
const base = 'http://localhost:3118';
let server, output = '', passed = 0;
const password = 'Aa1!' + randomBytes(16).toString('hex');
const env = {...process.env, DATABASE_URL:url.toString(), AUTH_SECRET:randomBytes(32).toString('hex')};
const cookies = response => response.headers.getSetCookie();
const value = (response, name) => cookies(response).find(x=>x.startsWith(name+'='))?.split(';')[0].slice(name.length+1);
const remember = response => value(response,'petshop_remember');
const session = response => value(response,'petshop_session');
const header = (r,s) => [r&&'petshop_remember='+r,s&&'petshop_session='+s].filter(Boolean).join('; ');
const request = (path,cookie='',options={}) => fetch(base+path,{redirect:'manual',...options,headers:{Cookie:cookie,Origin:base,...options.headers}});
const login = (role='client',enabled=true,cookie='',email=role+'@remember.invalid',pw=password) => request('/api/auth/'+role+'-login',cookie,{method:'POST',body:new URLSearchParams({email,password:pw,...(enabled?{remember:'on'}:{})})});
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
try {
  await source.$executeRawUnsafe('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  let pending=[];
  for(const row of await source.$queryRawUnsafe('SHOW TABLES')){
    const name=Object.values(row)[0];if(name.startsWith('_prisma'))continue;
    pending.push((await source.$queryRawUnsafe('SHOW CREATE TABLE `'+name+'`'))[0]['Create Table']);
  }
  while(pending.length){const next=[];for(const ddl of pending){try{await db.$executeRawUnsafe(ddl);}catch{next.push(ddl);}}assert.notEqual(next.length,pending.length,'Cannot clone schema');pending=next;}
  execFileSync(process.execPath,['scripts/ensure-remember.mjs'],{env,windowsHide:true,stdio:'pipe'});
  for(const [portal,role] of [['client','User'],['admin','Admin'],['superadmin','SuperAdmin']])await db.user.create({data:{email:portal+'@remember.invalid',role,firstName:'Remember',surname:'Test',password:await hash(password,4)}});
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3118'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b);
  let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw new Error('Server stopped');try{if((await request('/client/login')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'Server startup');
  let r, s, rotated;
  await test('checked login: persistent cookie, hashed storage, fixed 30-day expiry',async()=>{
    const res=await login();assert.equal(res.status,303);assert.match(res.headers.get('location'),/client\/dashboard/);r=remember(res);s=session(res);assert.ok(r&&s);
    const c=cookies(res).find(x=>x.startsWith('petshop_remember='));assert.match(c,/HttpOnly/i);assert.match(c,/SameSite=lax/i);assert.match(c,/Expires=/i);assert.match(c,/Secure/i);
    assert.doesNotMatch(cookies(res).find(x=>x.startsWith('petshop_session=')),/Max-Age|Expires/i);
    const [row]=await db.$queryRawUnsafe('SELECT * FROM remember_credentials WHERE id = ?',r.split('.')[0]);assert.equal(row.token_hash,createHash('sha256').update(r.split('.')[1]).digest('hex'));assert.ok(row.expires_at-Date.now()>29.9*86400000);
  });
  await test('browser reopen: remember-only login restores and redirects',async()=>{const res=await request('/client/login',header(r));assert.equal(res.status,307);assert.match(res.headers.get('location'),/client\/dashboard/);assert.ok(session(res));rotated=remember(res);assert.notEqual(rotated,r);});
  await test('concurrent old-token requests converge on the same rotated token',async()=>{const results=await Promise.all(Array.from({length:5},()=>request('/client/login',header(r))));for(const res of results){assert.equal(res.status,307);assert.equal(remember(res),rotated);}});
  await test('protected API restores expired/missing session in the same request',async()=>{const res=await request('/api/client/notifications',header(rotated));assert.equal(res.status,200);assert.ok(session(res));});
  await test('expired signed session is restored by valid remember credential',async()=>{const expired=await new SignJWT({}).setProtectedHeader({alg:'HS256'}).setExpirationTime(Math.floor(Date.now()/1000)-1).sign(new TextEncoder().encode(env.AUTH_SECRET));const res=await request('/api/client/notifications',header(rotated,expired));assert.equal(res.status,200);assert.ok(session(res));});
  await test('old token is rejected after rotation grace period',async()=>{await db.$executeRawUnsafe('UPDATE remember_credentials SET previous_until = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE id = ?',r.split('.')[0]);assert.equal((await request('/client/login',header(r))).status,200);});
  await test('customer cannot enter admin dashboard',async()=>{const res=await request('/admin/dashboard',header(rotated));assert.match(res.headers.get('location'),/admin\/login/);});
  await test('tampered credential rejected and cleared',async()=>{const tampered=r.slice(0,-1)+(r.endsWith('0')?'1':'0');const res=await request('/client/login',header(tampered));assert.equal(res.status,200);assert.equal(remember(res),'');});
  await test('incorrect password issues no credential',async()=>{const res=await login('client',true,'',undefined,'incorrect');assert.match(res.headers.get('location'),/error=invalid/);assert.equal(remember(res),undefined);});
  await test('unchecked login clears and revokes old browser credential',async()=>{const res=await login('client',false,header(rotated,s));assert.equal(remember(res),'');assert.ok(session(res));const replay=await request('/client/login',header(rotated));assert.equal(replay.status,200);});
  await test('normal session persists on refresh and logout revokes JWT',async()=>{const res=await login('client',false);const normal=session(res);assert.equal((await request('/api/client/notifications',header(null,normal))).status,200);await request('/api/auth/logout',header(null,normal),{method:'POST',body:new URLSearchParams()});assert.equal((await request('/api/client/notifications',header(null,normal))).status,401);});
  await test('logout revokes remember credential and session',async()=>{const res=await login();const rem=remember(res),sess=session(res);const out=await request('/api/auth/logout',header(rem,sess),{method:'POST',body:new URLSearchParams()});assert.equal(remember(out),'');assert.match(out.headers.get('location'),/client\/login/);assert.equal((await request('/client/login',header(rem))).status,200);assert.equal((await request('/api/client/notifications',header(null,sess))).status,401);});
  await test('expired credential rejected',async()=>{const res=await login();const rem=remember(res);await db.$executeRawUnsafe('UPDATE remember_credentials SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND) WHERE id = ?',rem.split('.')[0]);assert.equal((await request('/client/login',header(rem))).status,200);});
  await test('password change revokes all devices',async()=>{const a=remember(await login()),b=remember(await login());const user=await db.user.findUniqueOrThrow({where:{email:'client@remember.invalid'}});await db.user.update({where:{id:user.id},data:{password:await hash(password,4)}});for(const token of [a,b])assert.equal((await request('/client/login',header(token))).status,200);});
  await test('suspend/reactivate cannot revive a credential',async()=>{const rem=remember(await login());await db.user.update({where:{email:'client@remember.invalid'},data:{accountStatus:'Suspended'}});await db.user.update({where:{email:'client@remember.invalid'},data:{accountStatus:'Active'}});assert.equal((await request('/client/login',header(rem))).status,200);});
  await test('multiple devices stay independent',async()=>{const a=await login(),b=await login();await request('/api/auth/logout',header(remember(a),session(a)),{method:'POST',body:new URLSearchParams()});assert.equal((await request('/client/login',header(remember(b)))).status,307);});
  await test('restored sessions cannot outlive or bypass remember revocation',async()=>{const rem=remember(await login());const restored=await request('/client/login',header(rem));const restoredSession=session(restored);await db.$executeRawUnsafe('UPDATE remember_credentials SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ?',rem.split('.')[0]);assert.equal((await request('/api/client/notifications',header(null,restoredSession))).status,401);});
  await test('admin and superadmin restore only to authorized dashboards',async()=>{for(const portal of ['admin','superadmin']){const res=await login(portal);const restored=await request('/'+portal+'/login',header(remember(res)));assert.equal(restored.status,307);assert.match(restored.headers.get('location'),new RegExp('/'+portal+'/dashboard'));assert.equal((await request('/client/dashboard',header(remember(res)))).status,307);}});
  await test('deleted account cannot restore',async()=>{const rem=remember(await login());await db.user.delete({where:{email:'client@remember.invalid'}});assert.equal((await request('/client/login',header(rem))).status,200);});
  await test('Google cancelled callback preserves flow and does not issue remember credential',async()=>{const res=await request('/api/auth/google/callback?error=access_denied');assert.equal(res.status,303);assert.match(res.headers.get('location'),/error=google/);assert.equal(remember(res),undefined);});
  console.log(`${passed} tests passed. Isolated database retained: ${database}`);
} catch(error){console.error(error.message);console.error(output.slice(-4000));process.exitCode=1;}
finally{server?.kill();await db.$disconnect();await source.$disconnect();}
