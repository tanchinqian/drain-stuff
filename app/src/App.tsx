import { NavLink, Outlet, Route, Routes, Link } from 'react-router-dom';
import { Waves } from 'lucide-react';
import Overview from './pages/Overview';
import FeatureDetail from './pages/FeatureDetail';
import Faults from './pages/Faults';
import Trials from './pages/Trials';
function Layout(){return <><a className="skip-link" href="#main">Skip to content</a><header className="app-header"><Link className="brand" to="/"><Waves size={24} aria-hidden="true"/>Drain Trial Console</Link><div className="inline"><span className="badge"><span className="square"/>Synthetic demo data</span><Link className="button" to="/about">Limits</Link></div></header><nav className="navigation" aria-label="Console pages">{[['/','Overview'],['/trials','Trials'],['/batches','Batches'],['/faults','Faults'],['/about','About']].map(([to,label])=><NavLink end={to==='/'} key={to} to={to}>{label}</NavLink>)}</nav><main id="main"><Outlet/></main><footer>Operator view · Local ponding and drain upkeep · Synthetic demonstration</footer></>;}
export default function App(){return <Routes><Route element={<Layout/>}><Route index element={<Overview/>}/><Route path="feature/:id" element={<FeatureDetail/>}/><Route path="faults" element={<Faults/>}/><Route path="trials" element={<Trials/>}/><Route path="*" element={<section className="panel"><h1>Drain Trial Console</h1><p>The operator workspace is taking shape.</p></section>}/></Route></Routes>;}
