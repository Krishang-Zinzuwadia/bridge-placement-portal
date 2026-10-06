import {useEffect, useId, useRef, useState, type AnchorHTMLAttributes, type MouseEvent} from 'react';
import {FileText, UserRound, LoaderCircle, CheckCircle2, ExternalLink} from './icons';
import {resumeHref} from './core';
import {fetchUpload, uploadFile} from './services';
import {managedUploadPath} from './UserAvatar';
import './uploads.css';

export type UploadKind = 'resume' | 'avatar';
export type UploadResult = {url: string; filename: string; size: number; type: string};
export function validateUploadFile(kind: UploadKind, file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (kind === 'resume') {
    if (extension !== 'pdf' || (file.type && file.type !== 'application/pdf')) return 'Choose a PDF resume (.pdf).';
    if (file.size > 5 * 1024 * 1024) return 'Your PDF must be 5 MB or smaller.';
  } else {
    const extensions: Record<string, string[]> = {'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp']};
    const validExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '');
    if (!validExtension || (file.type && !extensions[file.type]?.includes(extension || ''))) return 'Choose a JPG, PNG, or WebP image.';
    if (file.size > 2 * 1024 * 1024) return 'Your image must be 2 MB or smaller.';
  }
  if (!file.size) return 'This file is empty. Choose another file.';
  return null;
}

type UploadPickerProps = {
  kind: UploadKind;
  value?: string;
  onUploaded: (result: UploadResult) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
};
export function UploadPicker({kind, value, onUploaded, onBusyChange, disabled = false, label, compact = false}: UploadPickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState<UploadResult>();
  const isResume = kind === 'resume';
  const title = label || (isResume ? 'Resume PDF' : 'Profile photo');
  async function choose(file?: File) {
    if (!file || busy || disabled) return;
    const issue = validateUploadFile(kind, file);
    setError(issue || '');
    if (issue) return;
    setBusy(true);
    onBusyChange?.(true);
    let result: UploadResult | undefined;
    try {
      result = await uploadFile(kind, file);
      setUploaded(result);
      await onUploaded(result);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'Please try again.';
      setError(result ? `File uploaded, but the screen could not refresh. ${detail}` : detail);
    } finally {setBusy(false); onBusyChange?.(false);}
  }
  const current = uploaded?.url === value ? uploaded : undefined;
  return <div className={`upload-picker${compact ? ' upload-compact' : ''}`} aria-busy={busy}>
    <span className="upload-label" id={`${id}-label`}>{title}</span>
    <div className="upload-picker-row">
      <span className="upload-symbol">{isResume ? <FileText size={22}/> : <UserRound size={22}/>}</span>
      <div className="upload-copy">
        <strong>{busy ? 'Uploading…' : current?.filename || (value ? (isResume ? 'Resume on file' : 'Current profile photo') : (isResume ? 'Add your resume' : 'Add a profile photo'))}</strong>
        <span id={`${id}-help`}>{isResume ? 'PDF only · Up to 5 MB' : 'JPG, PNG, or WebP · Up to 2 MB'}</span>
      </div>
      <input ref={inputRef} type="file" className="upload-file-input" tabIndex={-1}
        accept={isResume ? '.pdf,application/pdf' : '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'}
        aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} disabled={busy || disabled}
        onChange={event => {const file = event.target.files?.[0]; event.target.value = ''; void choose(file);}}/>
      <button type="button" className="upload-choose" aria-label={`${value ? 'Replace' : 'Choose'} ${isResume ? 'resume PDF' : 'profile photo'}`} aria-describedby={`${id}-help`} disabled={busy || disabled} onClick={() => inputRef.current?.click()}>
        {busy ? <LoaderCircle size={15} className="spin"/> : null}{busy ? 'Uploading' : value ? 'Replace' : isResume ? 'Choose PDF' : 'Choose image'}
      </button>
    </div>
    {isResume && value && <ResumeLink resume={value} className="upload-current-link">View current resume<ExternalLink size={13}/></ResumeLink>}
    {current && !busy && !error && <div className="upload-success" role="status"><CheckCircle2 size={13}/>{isResume ? 'PDF uploaded.' : 'Profile photo updated.'}</div>}
    {error && <div className="upload-error" role="alert">{error}</div>}
    {busy && <span className="upload-sr-only" role="status">Uploading {isResume ? 'resume' : 'profile photo'}. Please wait.</span>}
  </div>;
}

type ResumeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {resume: string};
export function ResumeLink({resume, children, onClick, onAuxClick, ...props}: ResumeLinkProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false; for (const [url, timer] of urls.current) {clearTimeout(timer); URL.revokeObjectURL(url);} urls.current.clear();};
  }, []);
  const privatePath = managedUploadPath(resume);
  async function openPrivate(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (busy || !privatePath) return;
    // Reserve the tab during the user gesture, before waiting for a fresh token.
    const tab = window.open('about:blank', '_blank');
    if (!tab) {setError('Allow a new tab to view your resume, then try again.'); return;}
    tab.opener = null;
    tab.document.title = 'Opening resume';
    tab.document.body.textContent = 'Opening your resume…';
    setBusy(true); setError('');
    try {
      const blob = await fetchUpload(privatePath);
      if (!mounted.current) {tab.close(); return;}
      if (tab.closed) return;
      const url = URL.createObjectURL(blob);
      const timer = setTimeout(() => {URL.revokeObjectURL(url); urls.current.delete(url);}, 5 * 60 * 1000);
      urls.current.set(url, timer);
      tab.location.replace(url);
    } catch (cause) {
      tab.close();
      setError(cause instanceof Error ? cause.message : 'The resume could not be opened. Please try again.');
    } finally {setBusy(false);}
  }
  return <><a {...props} href={resumeHref(resume)} target="_blank" rel="noreferrer" aria-busy={busy}
    onClick={event => {onClick?.(event); if (!event.defaultPrevented && privatePath) void openPrivate(event);}}
    onAuxClick={event => {onAuxClick?.(event); if (event.button === 1 && !event.defaultPrevented && privatePath) void openPrivate(event);}}>
    {busy ? <LoaderCircle size={14} className="spin"/> : null}{children}
  </a>{error && <span className="upload-error resume-link-error" role="alert">{error}</span>}</>;
}
