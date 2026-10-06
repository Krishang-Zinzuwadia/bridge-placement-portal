import {useEffect, useRef, useState} from 'react';
import {getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {ArrowLeft as ChevronLeft, ArrowRight as ChevronRight, LoaderCircle} from './icons';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({url}:{url:string}) {
 const [document,setDocument]=useState<PDFDocumentProxy>();
 const [page,setPage]=useState(1),[busy,setBusy]=useState(true),[error,setError]=useState(''),[text,setText]=useState(''),[width,setWidth]=useState(600);
 const container=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const element=container.current;if(!element)return;
  const observer=new ResizeObserver(entries=>setWidth(Math.max(160,entries[0].contentRect.width-32)));
  observer.observe(element);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  let active=true;setBusy(true);setError('');setDocument(undefined);setPage(1);
  const loading=getDocument({url,enableXfa:false});
  void loading.promise.then(pdf=>{if(active)setDocument(pdf)}).catch(()=>{if(active){setError('This PDF could not be previewed. Download it below to open it.');setBusy(false)}});
  return()=>{active=false;void loading.destroy();};
 },[url]);
 useEffect(()=>{
  if(!document||!canvas.current)return;
  let active=true,render:RenderTask|undefined;const target=canvas.current;
  setBusy(true);setError('');setText('');
  void document.getPage(page).then(async pdfPage=>{
   if(!active)return;
   const original=pdfPage.getViewport({scale:1});
   const viewport=pdfPage.getViewport({scale:Math.min(width/original.width,1600/original.height)});
   const density=Math.min(window.devicePixelRatio||1,2);
   target.width=Math.ceil(viewport.width*density);target.height=Math.ceil(viewport.height*density);
   target.style.width=viewport.width+'px';target.style.height=viewport.height+'px';
   render=pdfPage.render({canvas:target,viewport,transform:density===1?undefined:[density,0,0,density,0,0]});
   await render.promise;
   if(!active)return;
   const content=await pdfPage.getTextContent();
   if(active){setText(content.items.map(item=>'str' in item?item.str:'').join(' '));setBusy(false)}
  }).catch(()=>{if(active){setError('This page could not be displayed. Download the PDF below to open it.');setBusy(false)}});
  return()=>{active=false;render?.cancel();};
 },[document,page,width]);
 return <div className="pdf-preview" ref={container}>
  {document&&<div className="pdf-page-controls"><button type="button" className="icon-button" aria-label="Previous PDF page" disabled={page===1||busy} onClick={()=>setPage(value=>value-1)}><ChevronLeft size={19}/></button><span>Page {page} of {document.numPages}</span><button type="button" className="icon-button" aria-label="Next PDF page" disabled={page===document.numPages||busy} onClick={()=>setPage(value=>value+1)}><ChevronRight size={19}/></button></div>}
  {busy&&<p className="pdf-preview-status" role="status"><LoaderCircle size={19} className="spin"/>Rendering your PDF…</p>}
  {error&&<p className="upload-error" role="alert">{error}</p>}
  <div className="pdf-canvas-scroll"><canvas ref={canvas} role="img" aria-label={`Resume PDF page ${page}`} hidden={!document||!!error}/></div>
  <p className="upload-sr-only">{text}</p>
 </div>;
}
