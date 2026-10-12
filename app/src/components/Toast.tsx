import {useEffect} from 'react';
import {useSelection} from '../state';
export default function Toast(){const toast=useSelection(s=>s.toast),notify=useSelection(s=>s.notify);useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>notify(''),5500);return ()=>clearTimeout(timer);},[toast,notify]);return toast?<div className="toast" role="status">{toast}</div>:null;}
