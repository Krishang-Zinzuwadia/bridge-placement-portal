import React,{useState,useEffect,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {ClerkProvider} from '@clerk/react';
import {X,CheckCircle2,AlertCircle,LoaderCircle} from './icons';
import {go,Context,State,Link,Empty} from './core';
import {api,ApiError,AuthConfig,loadAuthConfig,signOut} from './services';
import {ClerkSessionBridge} from './ClerkIntegration';
import {Landing} from './Landing';
import {Auth,OnboardingPage} from './Auth';
import {Portal} from './Portal';
import './style.css';
import './typography.css';
import './identity.css';
function Loading(){return <div className="loading-screen" role="status"><LoaderCircle className="spin"/><span>Preparing your workspace…</span></div>}
function Mark404(){return <Empty title="This path needs a new direction." description="The page you’re looking for isn’t here. Let’s get you back to your next chapter."><Link to="/" className="btn">Back to CampusBridge</Link></Empty>}
function App({config}:{config:AuthConfig}){
 const [path,setPath]=useState(window.location.pathname),[data,setData]=useState<State|null>(null),[ready,setReady]=useState(false),[needsOnboarding,setNeedsOnboarding]=useState(false),[toast,setToast]=useState<{message:string;error:boolean}|null>(null);
 const usesClerk=config.provider==='clerk';
 const notify=useCallback((message:string,error=false)=>setToast({message,error}),[]);
 const refresh=useCallback(async()=>{try{setData(await api('/state'));setNeedsOnboarding(false)}catch(e){if(e instanceof ApiError&&e.code==='ONBOARDING_REQUIRED'){setData(null);setNeedsOnboarding(true)}else if(e instanceof ApiError&&e.status===401){setData(null);setNeedsOnboarding(false)}else if(!['/','/login','/signup'].includes(window.location.pathname))notify((e as Error).message,true)}finally{setReady(true)}},[notify]);
 const clerkReady=useCallback((signedIn:boolean)=>{if(signedIn)void refresh();else{setData(null);setNeedsOnboarding(false);setReady(true)}},[refresh]);
 useEffect(()=>{const change=()=>setPath(window.location.pathname);window.addEventListener('popstate',change);if(!usesClerk)void refresh();else if(!config.enabled)setReady(true);return()=>window.removeEventListener('popstate',change)},[refresh,usesClerk,config.enabled]);
 useEffect(()=>{if(!data)return;const timer=setInterval(()=>void refresh(),15000);return()=>clearInterval(timer)},[!!data,refresh]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(timer)},[toast]);
 useEffect(()=>{if(!ready)return;if(usesClerk&&needsOnboarding){if(path!=='/onboarding')go('/onboarding');return}if(usesClerk&&data&&(path==='/onboarding'||path.startsWith('/login')||path.startsWith('/signup'))){go('/'+data.user.role);return}if(path==='/onboarding'&&!data&&!needsOnboarding){go('/login');return}if(/^\/(student|recruiter|admin)(?:\/|$)/.test(path)){if(!data){go('/login');return}if(path.split('/')[1]!==data.user.role){notify('Your account does not have access to that workspace.',true);go('/'+data.user.role)}}},[path,ready,usesClerk,needsOnboarding,data?.user.role,notify]);
 async function act(endpoint:string,method:string,body:any,message:string){try{await api(endpoint,method,body);await refresh();notify(message);return true}catch(e){notify((e as Error).message,true);return false}}
 const authSuccess=async()=>{const state=await api('/state');setData(state);setNeedsOnboarding(false);setReady(true);go('/'+state.user.role)};
 const logout=async()=>{try{await signOut();setData(null);setNeedsOnboarding(false);go('/');notify('You’ve been signed out.')}catch(e){notify((e as Error).message,true)}};
 let page;
 if(path==='/')page=<Landing user={data?.user}/>;
 else if(path.startsWith('/login')||path.startsWith('/signup'))page=<Auth signup={path.startsWith('/signup')} onSuccess={authSuccess} provider={config.provider} enabled={config.enabled}/>;
 else if(!ready)page=<Loading/>;
 else if(usesClerk&&needsOnboarding)page=<OnboardingPage onSuccess={authSuccess}/>;
 else if(data&&path.startsWith('/'+data.user.role))page=<Context.Provider value={{data,refresh,act,notify}}><Portal path={path} logout={logout}/></Context.Provider>;
 else page=<main id="main-content" className="not-found"><Mark404/></main>;
 return <>{usesClerk&&config.enabled&&<ClerkSessionBridge onReady={clerkReady}/>}<a className="skip-link" href="#main-content">Skip to content</a>{page}{toast&&<div className={'toast '+(toast.error?'error':'')} role={toast.error?'alert':'status'}>{toast.error?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}<span>{toast.message}</span><button aria-label="Dismiss notification" onClick={()=>setToast(null)}><X size={16}/></button></div>}</>;
}
function Root(){const [config,setConfig]=useState<AuthConfig|null>(null),[failed,setFailed]=useState(false);useEffect(()=>{let active=true;loadAuthConfig().then(c=>{if(active)setConfig(c)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[]);if(failed)return <main className="not-found"><Empty title="We couldn’t connect right now." description="Please reload the page to try again."><button className="btn" onClick={()=>location.reload()}>Try again</button></Empty></main>;if(!config)return <Loading/>;return config.provider==='clerk'&&config.enabled?<ClerkProvider publishableKey={config.publishableKey} signInUrl="/login" signUpUrl="/signup"><App config={config}/></ClerkProvider>:<App config={config}/>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Root/></React.StrictMode>);
