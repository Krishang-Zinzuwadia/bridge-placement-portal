export type AuthConfig={provider:'clerk'|'demo';publishableKey:string;enabled:boolean;uploadsEnabled?:boolean};
type TokenResolver=()=>Promise<string|null>;
let resolveToken:TokenResolver|null=null;
let signOutProvider:(()=>Promise<void>)|null=null;

export class ApiError extends Error{
 constructor(message:string,public status:number,public code?:string){super(message);this.name='ApiError';}
}
// Session tokens stay in the Clerk SDK. Resolve a current token for every request.
export function setAuthBridge(getToken:TokenResolver,signOut:()=>Promise<void>){
 resolveToken=getToken;signOutProvider=signOut;
 return ()=>{if(resolveToken===getToken){resolveToken=null;signOutProvider=null;}};
}
export async function api(path:string,method='GET',body?:unknown){
 const token=resolveToken?await resolveToken():null;
 const headers:Record<string,string>={};
 if(body!==undefined)headers['Content-Type']='application/json';
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch('/api'+path,{method,credentials:'same-origin',headers,body:body!==undefined?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>({error:'The service returned an invalid response.'}));
 if(!response.ok)throw new ApiError(data.error||'Request failed',response.status,data.code);
 return data;
}
export async function loadAuthConfig():Promise<AuthConfig>{return api('/auth/config');}
export async function signOut(){if(signOutProvider)await signOutProvider();else await api('/logout','POST',{});}
export type UploadResult={url:string;filename:string;size:number;type:string};
async function fileRequest(path:string,init:RequestInit={}){const token=resolveToken?await resolveToken():null;const headers=new Headers(init.headers);if(token)headers.set('Authorization','Bearer '+token);const response=await fetch('/api'+path,{...init,headers,credentials:'same-origin'});if(!response.ok){const data=await response.json().catch(()=>({error:'The file service is unavailable.'}));throw new ApiError(data.error||'File request failed',response.status,data.code)}return response;}
export async function uploadFile(kind:'resume'|'avatar',file:File):Promise<UploadResult>{const body=new FormData();body.append('file',file);const response=await fileRequest('/'+kind,{method:'POST',body});return response.json();}
export async function fetchUpload(url:string):Promise<Blob>{const target=new URL(url,window.location.origin);if(target.origin!==window.location.origin||!/^\/api\/uploads\/[a-zA-Z0-9-]+$/.test(target.pathname))throw new Error('This file is not part of your current workspace.');const response=await fileRequest(target.pathname.slice(4));return response.blob();}
