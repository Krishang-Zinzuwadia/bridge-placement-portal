export type AuthConfig={provider:'clerk'|'demo';publishableKey:string;enabled:boolean};
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
