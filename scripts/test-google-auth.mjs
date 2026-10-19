import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import {SignJWT} from 'jose';
export async function checkGoogleAuth({test,p,request,html,admin,authSecret,callAction,base}){
  const {resolveGoogleCustomer}=await import('../src/lib/google-auth.ts');
  await test('Google sign-in button, state/PKCE redirect and safe callback rejection',async()=>{
    assert.ok((await html('/client/login')).includes('Continue with Google'));
    const start=await request('/api/auth/google');assert.equal(start.status,303);
    const redirect=new URL(start.headers.get('location'));assert.equal(redirect.origin,'https://accounts.google.com');assert.equal(redirect.searchParams.get('code_challenge_method'),'S256');assert.equal(redirect.searchParams.get('scope'),'openid email profile');assert.equal(redirect.searchParams.get('redirect_uri'),'http://localhost:3107/api/auth/google/callback');assert.equal(redirect.searchParams.get('state').length,43);assert.equal(redirect.searchParams.get('nonce').length,43);assert.ok(!redirect.searchParams.has('client_secret'));assert.ok(start.headers.get('set-cookie').includes('HttpOnly'));
    const callback=await request('/api/auth/google/callback?code=untrusted&state=untrusted');assert.equal(callback.status,303);assert.ok(callback.headers.get('location').includes('/client/login?error=google'));assert.ok(!callback.headers.get('set-cookie').includes('petshop_session='));
    const cancelled=await request('/api/auth/google/callback?error=access_denied&state='+redirect.searchParams.get('state'),start.headers.get('set-cookie').split(';')[0]);assert.equal(cancelled.status,303);assert.ok(cancelled.headers.get('set-cookie').includes('Max-Age=0'));assert.ok(!cancelled.headers.get('set-cookie').includes('petshop_session='));
  });
  await test('Google identities preserve account history, separate roles and reject unsafe email links',async()=>{
    const subject=()=>BigInt('0x'+randomBytes(8).toString('hex')).toString();
    const identity={subject:subject(),email:`google-${randomBytes(5).toString('hex')}@gmail.com`,firstName:'Google',surname:'Audit',authoritative:true,picture:'https://lh3.googleusercontent.com/a/audit-photo'};
    const created=await resolveGoogleCustomer(p,identity);assert.equal(created.role,'User');assert.equal(created.accountStatus,'Active');
    const customer=await p.customer.findFirstOrThrow({where:{email:identity.email}});assert.equal(customer.customerName,'Google Audit');assert.equal(customer.photoPath,identity.picture);
    await p.customer.update({where:{id:customer.id},data:{phone:'09123456789',address:'Saved Google customer address',photoPath:'/assets/dizons-logo.jpg'}});
    const again=await resolveGoogleCustomer(p,{...identity,email:'changed@gmail.com'});assert.equal(again.id,created.id);assert.equal(again.email,identity.email);assert.equal(await p.customer.count({where:{email:identity.email}}),1);
    const preserved=await p.customer.findUniqueOrThrow({where:{id:customer.id}});assert.equal(preserved.address,'Saved Google customer address');assert.equal(preserved.photoPath,'/assets/dizons-logo.jpg');
    const user=await p.user.findUniqueOrThrow({where:{email:'client@audit.invalid'}});
    await assert.rejects(()=>resolveGoogleCustomer(p,{...identity,subject:subject(),email:user.email,authoritative:false}));
    await assert.rejects(()=>resolveGoogleCustomer(p,{...identity,subject:subject(),email:admin.email}));
    await p.user.update({where:{id:created.id},data:{accountStatus:'Suspended'}});await assert.rejects(()=>resolveGoogleCustomer(p,identity));await p.user.update({where:{id:created.id},data:{accountStatus:'Active'}});
    const trusted={...identity,subject:subject(),email:`local-${randomBytes(5).toString('hex')}@gmail.com`};
    const local=await p.user.create({data:{email:trusted.email,role:'User',firstName:'Existing',password:user.password}});
    await assert.rejects(()=>resolveGoogleCustomer(p,trusted),/Use your existing email and password/);
    assert.equal((await p.user.findUniqueOrThrow({where:{id:local.id}})).password,user.password);
  });
  await test('Google concurrent first login creates one identity and customer',async()=>{
    const identity={subject:BigInt('0x'+randomBytes(8).toString('hex')).toString(),email:`google-race-${randomBytes(5).toString('hex')}@gmail.com`,firstName:'Concurrent',surname:'Customer',authoritative:true};
    const users=await Promise.all([resolveGoogleCustomer(p,identity),resolveGoogleCustomer(p,identity)]);assert.equal(users[0].id,users[1].id);assert.equal(await p.customer.count({where:{email:identity.email}}),1);
  });
  await test('Google customer application session: profile, checkout, history, receipts, roles and logout',async()=>{
    // Fixture identity resolution + signed application session, not a live
    // Google code exchange. Signature/claims validation is tested separately.
    const identity={subject:BigInt('0x'+randomBytes(8).toString('hex')).toString(),email:`google-features-${randomBytes(5).toString('hex')}@gmail.com`,firstName:'Google',surname:'Features',authoritative:true};
    const user=await resolveGoogleCustomer(p,identity),customer=await p.customer.findFirstOrThrow({where:{email:user.email}});
    const jwt=await new SignJWT({userId:user.id,role:'User',name:'Google Features',credentialVersion:createHmac('sha256',new TextEncoder().encode(authSecret)).update(user.password).digest('hex')}).setProtectedHeader({alg:'HS256'}).setJti(randomUUID()).setIssuedAt().setExpirationTime('8h').sign(new TextEncoder().encode(authSecret));
    const cookie='petshop_session='+jwt;
    assert.equal((await request('/client/dashboard',cookie)).status,200);
    await callAction('/client/dashboard?view=account',cookie,'updateProfile',{firstName:'Google',surname:'Updated',phone:'09123456789',address:'Google saved checkout address'});
    assert.equal((await p.customer.findUniqueOrThrow({where:{id:customer.id}})).address,'Google saved checkout address');
    const product=await p.product.create({data:{sku:'GOOGLE-'+randomBytes(5).toString('hex'),productName:'Google checkout fixture',category:'Dog Food',productGroup:'Food',price:'125',stockQuantity:5,isActive:1}});
    const quote=await request('/api/reservations/quote?'+new URLSearchParams({items:JSON.stringify([{productId:product.productId,quantity:2}])}),cookie);assert.equal(quote.status,200);assert.equal((await quote.json()).quote.profile.address,'Google saved checkout address');
    const tomorrow=new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,10);
    await callAction('/client/dashboard?view=products',cookie,'checkoutReservationCart',{items:JSON.stringify([{productId:product.productId,quantity:2,expectedPrice:125}]),pickupDate:tomorrow,pickupTime:'12:00',paymentMethod:'Cash',requestToken:randomBytes(16).toString('hex')});
    const reservation=await p.productReservation.findFirstOrThrow({where:{customerId:customer.id},include:{items:true}});assert.equal(reservation.items[0].quantity,2);assert.equal(reservation.items[0].productId,product.productId);
    assert.ok((await html('/client/dashboard?view=reservations',cookie)).includes(reservation.reservationCode));
    assert.equal((await request('/api/reservations/'+reservation.reservationId+'/receipt',cookie)).status,200);
    assert.equal((await request('/api/client/notifications',cookie)).status,200);
    assert.equal((await request('/admin/dashboard',cookie)).status,307);assert.equal((await request('/api/admin/notifications',cookie)).status,401);
    assert.equal((await request('/api/auth/logout',cookie,{method:'POST',body:new URLSearchParams(),headers:{Origin:base}})).status,303);
    assert.equal((await request('/api/client/notifications',cookie)).status,401);
  });
}
