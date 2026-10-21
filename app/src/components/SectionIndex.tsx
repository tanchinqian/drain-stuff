import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
export default function SectionIndex({items,children}:{items:[string,string][];children?:ReactNode}) {
  return <nav className="section-index" aria-label="Page sections">{items.map(([label,to])=>to.startsWith('#')?<a key={label} href={to} onClick={()=>{const target=document.querySelector(to);target?.closest('details')?.setAttribute('open','');}}>{label}</a>:<Link key={label} to={to}>{label}</Link>)}{children}</nav>;
}
