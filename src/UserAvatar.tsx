import {useEffect, useState} from 'react';
import {fetchUpload} from './services';
import './uploads.css';

// Only private uploads on this origin receive an authenticated fetch.
export function managedUploadPath(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && /^\/api\/uploads\/[A-Za-z0-9_-]+$/.test(url.pathname) ? url.pathname : null;
  } catch {return null;}
}

type UserAvatarProps = {name: string; src?: string; className?: string; size?: number};
export function UserAvatar({name, src, className = '', size}: UserAvatarProps) {
  const [image, setImage] = useState<{source?: string; url: string}>({url: ''});
  const [failed, setFailed] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setFailed(undefined);
    const privatePath = managedUploadPath(src);
    if (!privatePath) setImage({source: src, url: src || ''});
    else {
      setImage({source: src, url: ''});
      void fetchUpload(privatePath).then(blob => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({source: src, url: objectUrl});
      }).catch(() => {if (active) setFailed(src);});
    }
    return () => {active = false; if (objectUrl) URL.revokeObjectURL(objectUrl);};
  }, [src]);
  const imageUrl = image.source === src && failed !== src ? image.url : '';
  const initials = name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || '?';
  return <span className={`user-avatar ${className}`} role="img" aria-label={`${name || 'User'}’s profile photo`}
    style={size ? {width: size, height: size} : undefined}>
    {imageUrl ? <img src={imageUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(src)}/> : <span aria-hidden="true">{initials}</span>}
  </span>;
}
