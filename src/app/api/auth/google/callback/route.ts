import {cookies} from 'next/headers';
import {clearRemember,cookieValue,rememberCookieName,revokeRemember} from '@/lib/remember';
import {NextResponse} from 'next/server';
import {googleConfig,googleFlowCookie,verifyGoogleFlow,verifyGoogleIdentity,resolveGoogleCustomer} from '@/lib/google-auth';
import {prisma} from '@/lib/prisma';
import {createSessionToken,sessionCookieName} from '@/lib/session';
import {writeAuditSafely,requestIp} from '@/lib/operations';
export async function GET(request:Request){
  let destination='/client/login?error=google';let sessionToken:string|undefined;
  try{
    const config=googleConfig(),params=new URL(request.url).searchParams;
    if(new URL(request.url).origin!==config.origin)throw new Error('Invalid callback origin.');
    const flow=await verifyGoogleFlow((await cookies()).get(googleFlowCookie)?.value||'',params.get('state')||'');
    if(params.has('error'))throw new Error(params.get('error')==='access_denied'?'Google sign-in cancelled.':'Google sign-in failed.');
    const code=params.get('code');if(!code||code.length>4096)throw new Error('Missing authorization code.');
    const exchange=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri,code_verifier:flow.verifier}),cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!exchange.ok)throw new Error('Google code exchange failed.');
    const tokens=await exchange.json();if(typeof tokens.id_token!=='string')throw new Error('Missing identity token.');
    const identity=await verifyGoogleIdentity(tokens.id_token,flow.nonce,config.clientId);
    const user=await resolveGoogleCustomer(prisma,identity);
    const name=[user.firstName,user.surname].filter(Boolean).join(' ')||'Customer';
    await revokeRemember(cookieValue(request,rememberCookieName));
    sessionToken=await createSessionToken({userId:user.id,role:'User',name});
    await writeAuditSafely(prisma,{userId:user.id,name,role:'User'},'LOGIN','Authentication','Customer signed in with Google.',user.id,await requestIp());
    destination='/client/dashboard?notice='+encodeURIComponent('Signed in with Google. Welcome!');
  }catch(error){
    if(error instanceof Error&&error.message==='Use your existing email and password to sign in.')destination='/client/login?error=google-password';
    else if(error instanceof Error&&error.message==='Google sign-in cancelled.')destination='/client/login?error=google-cancelled';
    else if(error instanceof Error&&error.message==='Google account is unavailable.')destination='/client/login?error=google-account';
    // Never log authorization codes, tokens, client secrets, or provider responses.
  }
  const response=NextResponse.redirect(new URL(destination,request.url),303);
  if(sessionToken)clearRemember(response);
  response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');
  response.cookies.set(googleFlowCookie,'',{httpOnly:true,sameSite:'lax',secure:new URL(request.url).protocol==='https:',path:'/api/auth/google',maxAge:0});
  if(sessionToken)response.cookies.set(sessionCookieName,sessionToken,{httpOnly:true,sameSite:'lax',secure:new URL(request.url).protocol==='https:',path:'/',maxAge:28800});
  return response;
}
