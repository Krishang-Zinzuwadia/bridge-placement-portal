const fail=(message,status=400,code)=>{throw Object.assign(new Error(message),{status,code});};
export const uploadLimit=kind=>kind==='resume'?5*1024*1024:2*1024*1024;
export const multipartLimit=kind=>uploadLimit(kind)+64*1024;
const uploadUrl=(request,id)=>new URL('/api/uploads/'+id,request.url).href;
const filename=name=>String(name||'upload').split(/[\\/]/).at(-1).replace(/[\x00-\x1f\x7f"<>:;]/g,'_').slice(0,180)||'upload';
async function boundedBytes(request,limit){
 if(Number(request.headers.get('Content-Length'))>limit)fail('This file is too large.',413);
 if(!request.body)fail('Select a file to upload.');
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();fail('This file is too large.',413);}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
function validMagic(bytes,type){
 if(type==='application/pdf')return new TextDecoder().decode(bytes.slice(0,5))==='%PDF-'&&new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF');
 if(type==='image/png')return [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
 if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes.at(-2)===255&&bytes.at(-1)===217;
 if(type==='image/webp')return new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
 return false;
}
export async function uploadFile(request,env,user,kind){
 if(kind==='resume'&&user.role!=='student')fail('Only students can upload resumes.',403);
 if(!env.UPLOADS)fail('File storage is not available yet.',503,'UPLOADS_UNAVAILABLE');
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data'))fail('Select a file using the upload picker.');
 const bytes=await boundedBytes(request,multipartLimit(kind));let form;
 try{form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData();}catch{fail('Upload a valid file.');}
 const files=form.getAll('file');const file=files[0];
 if(files.length!==1||!file||typeof file==='string'||typeof file.arrayBuffer!=='function')fail('Select exactly one file.');
 if(!file.size)fail('This file is empty.');
 if(file.size>uploadLimit(kind))fail(kind==='resume'?'Choose a PDF up to 5 MB.':'Choose an image up to 2 MB.',413);
 const type=String(file.type).toLowerCase();
 if(kind==='resume'&&(type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf')))fail('Your resume must be a PDF file.');
 if(kind==='avatar'&&!['image/jpeg','image/png','image/webp'].includes(type))fail('Choose a JPEG, PNG or WebP image.');
 const content=new Uint8Array(await file.arrayBuffer());
 if(!validMagic(content,type))fail(kind==='resume'?'Your resume must contain a valid PDF.':'This file is not a supported image.');
 const id=crypto.randomUUID(),key=kind+'/'+user.id+'/'+id,name=filename(file.name),url=uploadUrl(request,id);
 await env.UPLOADS.put(key,content,{httpMetadata:{contentType:type}});
 try{
  const queries=[env.DB.prepare('INSERT INTO uploads(id,owner_id,kind,object_key,original_name,mime_type,byte_size) VALUES(?,?,?,?,?,?,?)').bind(id,user.id,kind,key,name,type,content.byteLength)];
  if(kind==='avatar')queries.push(env.DB.prepare("UPDATE users SET avatar_url=?,avatar_source='upload' WHERE id=?").bind(url,user.id));
  await env.DB.batch(queries);
 }catch(e){await env.UPLOADS.delete(key);throw e;}
 return {url,filename:name,size:content.byteLength,type};
}
export async function getUpload(request,env,user,id){
 if(!env.UPLOADS)fail('File storage is not available yet.',503,'UPLOADS_UNAVAILABLE');
 const file=await env.DB.prepare('SELECT * FROM uploads WHERE id=?').bind(id).first();
 if(!file)fail('File not found.',404);
 if(user.id!==file.owner_id&&user.role!=='admin'){
  const field=file.kind==='resume'?'resume':'avatar_url';
  const permitted=user.role==='recruiter'&&await env.DB.prepare(`SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id WHERE c.owner_id=? AND a.student_id=? AND json_valid(a.snapshot) AND json_extract(a.snapshot,'$.${field}')=? LIMIT 1`).bind(user.id,file.owner_id,uploadUrl(request,id)).first();
  if(!permitted)fail('You do not have access to this file.',403);
 }
 const object=await env.UPLOADS.get(file.object_key);if(!object)fail('File not found.',404);
 return new Response(object.body,{headers:{'Content-Type':file.mime_type,'Content-Length':String(file.byte_size),'Content-Disposition':`inline; filename="${filename(file.original_name).replace(/[^\x20-\x7e]/g,'_')}"; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
export async function validateResumeReference(db,user,value,request){
 if(!value)return;
 let url;try{url=new URL(String(value),request.url);}catch{return;}
 if(!url.pathname.startsWith('/api/uploads/'))return;
 if(url.origin!==new URL(request.url).origin||url.search||url.hash)fail('Select a resume uploaded to this workspace.');
 const file=await db.prepare('SELECT owner_id,kind FROM uploads WHERE id=?').bind(url.pathname.slice('/api/uploads/'.length)).first();
 if(!file)fail('This uploaded resume was not found.',404);
 if(file.owner_id!==user.id)fail('Choose your own uploaded resume.',403);
 if(file.kind!=='resume')fail('Select a PDF resume upload.');
}
