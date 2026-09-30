const BASE=import.meta.env.VITE_API_URL||'';
export const api=async(p,o={})=>{const t=localStorage.getItem('xyz_token');const r=await fetch(BASE+'/api'+p,{...o,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:o.body&&JSON.stringify(o.body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d};
export const CATS=['Readymade Suits','Co-ord Sets','Kaftans','Tops & Western','Kurtis'];
export const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN');
export const FREE_SHIP=5000,SHIP=150,WA='919999999999';
