import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import ClientAuthLayout from "@/components/ClientAuthLayout";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import LoginSubmit from "@/components/LoginSubmit";

export default async function ClientLogin({searchParams}:{searchParams:Promise<{error?:string;registered?:string;reset?:string}>}){
 const {error,registered,reset}=await searchParams;
 return <ClientAuthLayout><div className="clientAuthCard"><h1>LOGIN</h1>
 {error&&<div className="authError" role="alert">{error==='google-cancelled'?'Google sign-in was cancelled. You can try again or use your email and password.':error==='google-account'?'Google sign-in cannot access this account. Please contact the shop for help.':error==='google-config'?'Google sign-in is not available yet. Please use your email and password.':error==='google-password'?'Please use your existing email and password for this account.':error==='google'?'Google sign-in was cancelled or could not be completed. Please try again.':error==="database-config"||error==="unavailable"?"Something went wrong. Please try again.":error==="session"?"Your session could not be validated. Please log in again.":"Invalid email or password."}</div>}
 {registered&&<div className="authSuccess" role="status">Account created successfully. You can now log in.</div>}
 {reset&&<div className="authSuccess" role="status">Password updated successfully. You can now log in.</div>}
 <form action="/api/auth/client-login" method="post" className="clientAuthForm"><label>EMAIL<input type="email" name="email" placeholder="Email" autoComplete="email" required/></label><label>PASSWORD<PasswordInput placeholder="Password" required/></label><div className="loginOptions"><label className="rememberOption"><input type="checkbox" name="remember"/>Remember Me</label><Link className="clientAuthForgot" href="/client/forgot-password">Forgot Password?</Link></div><LoginSubmit className="clientAuthSubmit">LOG IN</LoginSubmit></form>
 <GoogleSignInButton/>
 <p className="clientAuthMeta">Don&apos;t have an account? <Link href="/client/register">Sign Up</Link></p><Link className="clientAuthHome" href="/">Back to home</Link></div></ClientAuthLayout>;
}
