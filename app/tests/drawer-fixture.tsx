import {StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Drawer from '../src/components/Drawer';
import '../src/styles.css';
function Fixture(){const[first,setFirst]=useState(false),[second,setSecond]=useState(false);return <main><h1>Drawer interaction check</h1><button onClick={()=>setFirst(true)}>Open first</button>{first&&<Drawer title="First record" onClose={()=>setFirst(false)}><label>Draft note<input/></label><button onClick={()=>setSecond(true)}>Open second</button></Drawer>}{second&&<Drawer title="Second record" onClose={()=>setSecond(false)}><p>Replacement record</p></Drawer>}</main>;}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
