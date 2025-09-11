// Ultra-lightweight theme manager
(()=>{
let t='light',d=document.documentElement,m=matchMedia('(prefers-color-scheme:dark)'),s=localStorage,k='theme';
function a(h){t=h;h==='dark'?d.setAttribute('data-theme','dark'):d.removeAttribute('data-theme');let e=document.querySelector('meta[name="theme-color"]');e||(e=document.createElement('meta'),e.name='theme-color',document.head.appendChild(e));e.content=h==='dark'?'#1e293b':'#374151'}
function g(){let h=t==='dark'?'light':'dark';a(h);u();s.setItem(k,h)}
function u(){let e=d.querySelector('.theme-toggle');if(!e)return;let h=t==='dark';e.innerHTML=h?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="m12 1v6m0 10v6m11-7h-6M7 12H1m17.66-6.34l-4.24 4.24M9.17 14.83l-4.24 4.24m12.73 0l-4.24-4.24M9.17 9.17L4.93 4.93"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'}
function i(){t=s.getItem(k)||(m.matches?'dark':'light');a(t);let e=document.createElement('button');e.className='theme-toggle';e.setAttribute('aria-label','Toggle theme');e.onclick=g;document.body.appendChild(e);u();m.addEventListener('change',h=>{if(!s.getItem(k)){t=h.matches?'dark':'light';a(t);u()}})}
d.readyState==='loading'?d.addEventListener('DOMContentLoaded',i):i()
})();