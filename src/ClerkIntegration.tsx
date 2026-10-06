import './auth-form.css';
import {useEffect,useState} from 'react';
import {SignIn,SignUp,useAuth,useClerk,useUser} from '@clerk/react';
import {Building2,GraduationCap,ArrowRight,ShieldCheck} from './icons';
import {api,setAuthBridge} from './services';
import {Button} from './core';

// Mount inside ClerkProvider; defer application /state until this reports readiness.
export function ClerkSessionBridge({onReady}:{onReady:(signedIn:boolean)=>void}){
 const {isLoaded,isSignedIn,getToken}=useAuth();const clerk=useClerk();
 useEffect(()=>{
  if(!isLoaded)return;
  const clear=setAuthBridge(()=>getToken(),()=>clerk.signOut());
  onReady(Boolean(isSignedIn));
  return clear;
 },[isLoaded,isSignedIn,getToken,clerk,onReady]);
 return null;
}
const appearance={
 variables:{colorPrimary:'#214c3a',colorText:'#26382d',colorTextSecondary:'#6b7a6c',colorBackground:'#fffefa',colorInputBackground:'#f9fbf7',colorInputText:'#26382d',borderRadius:'8px',fontFamily:'Satoshi, Arial, sans-serif'},
 elements:{rootBox:{width:'100%'},cardBox:{width:'100%',boxShadow:'none'},card:{boxShadow:'none',padding:'0',background:'transparent'},header:{display:'none'},footer:{background:'transparent'},formButtonPrimary:{background:'var(--auth-primary)',color:'var(--auth-primary-ink)',backgroundImage:'none',boxShadow:'none',minHeight:'50px',fontSize:'14px',fontWeight:600},socialButtonsBlockButton:{minHeight:'50px',border:'1px solid var(--auth-border)',background:'var(--auth-input)',color:'var(--auth-text)'},formFieldInput:{minHeight:'50px',background:'var(--auth-input)',color:'var(--auth-text)',borderColor:'var(--auth-border)'},footerActionLink:{color:'var(--auth-link)',fontWeight:600}}
};
export function ClerkAuthForm({signup}:{signup:boolean}){
 return <div className="clerk-auth-form">{signup?<SignUp routing="hash" signInUrl="/login" forceRedirectUrl="/onboarding" appearance={appearance}/>:<SignIn routing="hash" signUpUrl="/signup" forceRedirectUrl="/onboarding" appearance={appearance}/>}<div className="auth-secure"><ShieldCheck size={13}/>Secure sign-in and account recovery by Clerk.</div></div>;
}
export function ClerkOnboarding({onSuccess}:{onSuccess:()=>Promise<void>}){
 const {user}=useUser();const clerk=useClerk();
 const [role,setRole]=useState<'student'|'recruiter'>('student'),[name,setName]=useState(''),[company,setCompany]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setName(user?.fullName||user?.username||'');},[user?.id,user?.fullName,user?.username]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await api('/onboard','POST',{role,name,company});await onSuccess();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="auth-form-wrap"><div className="eyebrow">YOUR ACCOUNT IS READY</div><h1>Make your introduction.</h1><p>Choose how you’ll use Bridge. Your workspace follows your role.</p><div className="role-tabs"><button type="button" aria-pressed={role==='student'} className={role==='student'?'active':''} onClick={()=>setRole('student')}><GraduationCap size={18}/>I’m a student</button><button type="button" aria-pressed={role==='recruiter'} className={role==='recruiter'?'active':''} onClick={()=>setRole('recruiter')}><Building2 size={18}/>I’m a recruiter</button></div><form onSubmit={submit}><label>Full name<input required autoComplete="name" maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label><label>Email address<input aria-label="Verified account email" disabled value={user?.primaryEmailAddress?.emailAddress||''}/></label>{role==='recruiter'&&<label>Company name<input required maxLength={100} autoComplete="organization" value={company} onChange={e=>setCompany(e.target.value)} placeholder="Your company"/></label>}{role==='recruiter'&&<p className="muted">Your company profile will go to the placement office for approval.</p>}{error&&<div className="form-error" role="alert">{error}</div>}<Button busy={busy} type="submit" className="full">Enter my workspace<ArrowRight size={17}/></Button></form><p className="auth-switch">Using a different account? <button type="button" disabled={busy} onClick={()=>void clerk.signOut({redirectUrl:'/login'}).catch(e=>setError((e as Error).message))}>Sign out</button></p></div>;
}
