"use client";
import {useEffect, useRef, useState} from 'react';
export default function LoginSubmit({children, className}: {children: React.ReactNode; className?: string}) {
  const button = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const form = button.current?.form;
    const submit = () => setPending(true);
    const reset = () => setPending(false);
    form?.addEventListener('submit', submit);
    window.addEventListener('pageshow', reset);
    return () => {form?.removeEventListener('submit', submit); window.removeEventListener('pageshow', reset);};
  }, []);
  return <button ref={button} className={className} type="submit" disabled={pending} aria-busy={pending}>{pending ? 'Signing in…' : children}</button>;
}
