import {useState, type FormEvent} from 'react';
import {PageHead, Button, useApp} from './core';
import {UserRound, CheckCircle2, ShieldCheck} from './icons';
import {UploadPicker} from './UploadPicker';
import {UserAvatar} from './UserAvatar';

export function PersonalProfile(){
 const {data,act,refresh}=useApp(),user=data.user;
 const [name,setName]=useState(user.name),[bio,setBio]=useState(user.bio||'');
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[previewAvatar,setPreviewAvatar]=useState<string>();
 const roleLabel=user.role==='admin'?'Placement administrator':'Company recruiter';
 async function save(event:FormEvent){
  event.preventDefault();if(busy||uploading)return;setBusy(true);
  try{if(await act('/account-profile','PUT',{name,bio},'Your profile has been updated.'))setDirty(false)}finally{setBusy(false)}
 }
 return <><PageHead eyebrow="YOUR PERSONAL PROFILE" title="Make it yours." description="Manage your name, introduction, and profile photo here."/>
  <div className="profile-layout"><section className="panel form-panel">
   <div className="form-section-header"><UserRound size={20}/><div><h2>Personal details</h2><p>Your introduction to the campus community.</p></div></div>
   <form onSubmit={save}><div className="form-grid">
    <label>Full name<input required maxLength={100} autoComplete="name" value={name} disabled={busy} onChange={event=>{setName(event.target.value);setDirty(true)}}/></label>
    <label>Email address<input type="email" value={user.email} disabled/><small>Your account’s registered email address.</small></label>
   </div><label>A little about you <span>(optional)</span><textarea rows={5} maxLength={2000} value={bio} disabled={busy} onChange={event=>{setBio(event.target.value);setDirty(true)}} placeholder="Introduce yourself to your campus community…"/></label>
   <div className="form-footer"><span>{dirty?'You have unsaved changes.':'Your profile is up to date.'}</span><Button type="submit" busy={busy} disabled={uploading}>Save my profile<CheckCircle2 size={16}/></Button></div></form>
  </section><aside><section className="profile-preview">
   <UserAvatar name={name} src={previewAvatar||user.avatar_url} className="large-avatar"/>
   <div className="profile-photo-picker"><UploadPicker kind="avatar" label="Your profile photo" value={previewAvatar||user.avatar_url} compact disabled={busy} onBusyChange={setUploading} onUploaded={async result=>{setPreviewAvatar(result.url);await refresh();setPreviewAvatar(undefined)}}/></div>
   <h2>{name}</h2><p>{roleLabel}</p><p className="profile-preview-bio">{bio||'Add a short introduction to tell the campus community about yourself.'}</p>
  </section><div className="detail-tip"><ShieldCheck size={25}/><h3>Your account, your workspace.</h3><p>Your email and role are managed through your registered account and placement office.</p></div></aside></div>
 </>;
}
