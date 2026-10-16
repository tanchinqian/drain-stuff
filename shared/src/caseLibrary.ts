import type {CaseRecord,GuidanceRecord} from './contract';
export const sourceUrls={
 sriMuda:'https://www.malaymail.com/news/malaysia/2022/01/24/fire-dept-clogged-drains-cause-stagnant-water-in-taman-sri-muda/2037276',
 sock:'https://www.epa.gov/system/files/documents/2021-11/bmp-compost-filter-socks.pdf',
 rainGarden:'https://stormwater.pca.state.mn.us/rain_gardens_bioretention_101',
 preStorm:'https://www.ashevillenc.gov/news/asheville-asks-how-does-stormwater-services-prepare-for-heavy-rain/',
};
const example=(id:string,assetType:string,part:string,ruleId:string,symptoms:string,cause:string,source:keyof typeof sourceUrls,stepsTaken:string[]):CaseRecord=>({id,assetType,part,ruleId,symptoms,cause,sourceLabel:'Guidance-based example',sourceUrl:sourceUrls[source],stepsTaken,sensorFlags:[],outcome:'Worked example only; no field outcome measured.',createdBy:'Sourced reference library'});
export const referenceCases:CaseRecord[]=[
 {id:'CASE-MM-20220124',assetType:'inlet',part:'inlet',ruleId:'inlet_debris',symptoms:'Water remained after heavy rain; drains reported clogged.',cause:'Reported drainage obstruction',sourceLabel:'Reported incident · Malay Mail / Bernama · 24 Jan 2022',sourceUrl:sourceUrls.sriMuda,stepsTaken:[],sensorFlags:[],outcome:'Report describes receding water; no verified clearance outcome or causal maintenance test is supplied.',createdBy:'Sourced reference library'},
 example('CASE-INLET-1','inlet','inlet','inlet_debris','Leaves and litter obstruct a roadside inlet before rain.','Inlet debris','preStorm',['STEP-blockage-1','STEP-blockage-2','STEP-blockage-4','STEP-blockage-5']),
 example('CASE-INLET-2','swale','inlet','inlet_debris','Visible debris at the inlet; inspect access and arrange trained clearance.','Inlet debris','preStorm',['STEP-blockage-1','STEP-blockage-2','STEP-blockage-4']),
 example('CASE-SOCK-1','swale','sock','inlet_debris','Deposits restrict a filter sock; inspect the barrier and accumulated sediment.','Sock sediment accumulation','sock',['STEP-sediment-1','STEP-sediment-2','STEP-sediment-3']),
 example('CASE-SOCK-2','swale','sock','inlet_debris','Filter sock sediment needs inspection and an appropriate material check.','Sock sediment accumulation','sock',['STEP-sediment-1','STEP-sediment-2','STEP-sediment-4']),
 example('CASE-SEDIMENT-1','swale','pretreat','outlet_condition','Excess soil obstructs the inlet; document and arrange removal.','Sediment deposition','rainGarden',['STEP-sediment-1','STEP-sediment-2','STEP-sediment-3']),
 example('CASE-SEDIMENT-2','inlet','pretreat','outlet_condition','Sediment and debris may obstruct drainage; inspect before rain.','Sediment deposition','preStorm',['STEP-sediment-1','STEP-sediment-2','STEP-sediment-3']),
 example('CASE-POND-1','swale','ponding','persistent_ponding','Water remains in the rain garden after rain; inspect inlet and drainage.','Drainage needs reference inspection','rainGarden',['STEP-standing_water-1','STEP-standing_water-2','STEP-standing_water-3']),
 example('CASE-POND-2','swale','media','persistent_ponding','Persistent ponding and compacted soil require a reference check.','Drainage needs reference inspection','rainGarden',['STEP-standing_water-1','STEP-standing_water-2','STEP-standing_water-3']),
];
export const referenceGuidance:GuidanceRecord[]=[
 {id:'GUIDE-EPA-SOCK',title:'Filter sock inspection and material suitability',passage:'Inspect accumulated sediment and the sock condition. Use mature, stable compost meeting applicable material requirements; the barrier is not a substitute for a safe overflow path.',sourceUrl:sourceUrls.sock,appliesTo:['sock','pretreat']},
 {id:'GUIDE-MN-GARDEN',title:'Rain garden maintenance',passage:'Inspect inlet obstruction, vegetation and excess soil. Avoid trampling and compacting the garden. Drainage concerns need a site-specific inspection.',sourceUrl:sourceUrls.rainGarden,appliesTo:['inlet','media','planting','ponding']},
 {id:'GUIDE-ASHEVILLE',title:'Preparation before heavy rain',passage:'Municipal crews inspect vulnerable sites and clear debris from drains and known trouble areas, with equipment and staff coordination before heavy rain.',sourceUrl:sourceUrls.preStorm,appliesTo:['inlet','outfall','pretreat']},
];
