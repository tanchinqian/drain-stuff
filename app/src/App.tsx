import {Route,Routes,Link} from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Overview from './pages/Overview';
import FeatureDetail from './pages/FeatureDetail';
import Faults from './pages/Faults';
import Trials from './pages/Trials';
import Batches from './pages/Batches';
import About from './pages/About';
export default function App(){return <Routes><Route element={<AppLayout/>}><Route index element={<Overview/>}/><Route path="feature/:id" element={<FeatureDetail/>}/><Route path="faults" element={<Faults/>}/><Route path="trials" element={<Trials/>}/><Route path="batches" element={<Batches/>}/><Route path="about" element={<About/>}/><Route path="*" element={<section className="panel"><h1>This page is not available</h1><Link to="/">Open Overview</Link></section>}/></Route></Routes>;}
