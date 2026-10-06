import React,{useState,useEffect,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {X,CheckCircle2,AlertCircle,LoaderCircle} from 'lucide-react';
import {api,go,Context,State} from './core';
import {Landing} from './Landing';
import {Auth} from './Auth';
import {Portal} from './Portal';
import './style.css';
function App(){
 const [path,setPath]=useState(window.location.pathname),[data,setData]=useState<State|null>(null),[ready,setReady]=useState(false),[toast,setToast]=useState<{message:string;error:boolean}|null>(null);
 const notify=useCallback((message:string,error=false)=>setToast({message,error}),[]);
 const refresh=useCallback(async()=>{try{setData(await api('/state'))}catch(e){if((e as Error).message==='Unauthorized')setData(null);else if(window.location.pathname!=='/'&&!window.location.pathname.startsWith('/login'))notify((e as Error).message,true)}finally{setReady(true)}},[notify]);
 useEffect(()=>{const change=()=>setPath(window.location.pathname);window.addEventListener('popstate',change);void refresh();return()=>window.removeEventListener('popstate',change)},[refresh]);
 useEffect(()=>{if(!data)return;const timer=setInterval(()=>void refresh(),15000);return()=>clearInterval(timer)},[!!data,refresh]);
 useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(timer)}},[toast]);
 useEffect(()=>{if(!ready)return;if(/^\/(student|recruiter|admin)/.test(path)){if(!data){go('/login');return}const role=path.split('/')[1];if(role!==data.user.role){notify('Your account does not have access to that workspace.',true);go('/'+data.user.role)}}},[path,ready,data?.user.role,notify]);
 async function act(endpoint:string,method:string,body:any,message:string){try{await api(endpoint,method,body);await refresh();notify(message);return true}catch(e){notify((e as Error).message,true);return false}}
 const authSuccess=async()=>{await refresh();const result=await api('/state');setData(result);go('/'+result.user.role)};
 const logout=async()=>{await api('/logout','POST',{});setData(null);go('/');notify('You’ve been signed out.')};
 return <>{path==='/'?<Landing user={data?.user}/>:path.startsWith('/login')||path.startsWith('/signup')?<Auth signup={path.startsWith('/signup')} onSuccess={authSuccess}/>:!ready?<div className="loading-screen"><LoaderCircle className="spin"/><span>Preparing your workspace…</span></div>:data&&path.startsWith('/'+data.user.role)?<Context.Provider value={{data,refresh,act,notify}}><Portal path={path} logout={logout}/></Context.Provider>:<div className="loading-screen"><LoaderCircle className="spin"/><span>Checking access…</span></div>}{toast&&<div className={'toast '+(toast.error?'error':'')} role={toast.error?'alert':'status'}>{toast.error?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}<span>{toast.message}</span><button aria-label="Dismiss notification" onClick={()=>setToast(null)}><X size={16}/></button></div>}</>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
