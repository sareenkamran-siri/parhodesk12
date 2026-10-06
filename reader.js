'use strict';
(()=>{const root=document.querySelector('.reader');if(!root)return;const q=s=>root.querySelector(s),chapters=[...root.querySelectorAll('.book-chapter')],book=root.dataset.book,key='studykit-bookmark-'+book;let index=0;
const message=t=>q('#reader-status').textContent=t;
function readBookmark(){try{const b=JSON.parse(localStorage.getItem(key));return b&&Number.isInteger(b.chapter)&&b.chapter>=0&&b.chapter<chapters.length&&Number.isFinite(b.fraction)&&b.fraction>=0&&b.fraction<=1?b:null}catch{return null}}
function buttons(){const b=readBookmark();q('#resume-bookmark').disabled=!b;q('#clear-bookmark').disabled=!b;return b}
function show(n,scroll=true){if(!Number.isInteger(n)||n<0||n>=chapters.length)n=0;index=n;chapters.forEach((c,i)=>c.hidden=i!==n);q('#chapter-select').value=String(n);q('#chapter-prev').disabled=n===0;q('#chapter-next').disabled=n===chapters.length-1;q('#chapter-progress').textContent=`${n+1} / ${chapters.length}`;try{history.replaceState(null,'','#chapter-'+(n+1))}catch{}if(scroll)chapters[n].scrollIntoView({block:'start'});}
q('#chapter-select').onchange=()=>show(Number(q('#chapter-select').value));q('#chapter-prev').onclick=()=>show(index-1);q('#chapter-next').onclick=()=>show(index+1);
q('#reader-size').onchange=()=>{root.style.setProperty('--book-size',q('#reader-size').value+'px');try{localStorage.setItem('studykit-reading-size',q('#reader-size').value)}catch{message('Text size changed for this visit. Browser storage is unavailable.')}};
q('#save-bookmark').onclick=()=>{const c=chapters[index],fraction=Math.min(1,Math.max(0,(q('.reader-tools').getBoundingClientRect().bottom-c.getBoundingClientRect().top)/Math.max(1,c.offsetHeight)));try{localStorage.setItem(key,JSON.stringify({chapter:index,fraction}));buttons();message(`Place saved in chapter ${index+1}, on this browser.`)}catch{message('Could not save: browser storage is unavailable. You can still read normally.')}};
q('#resume-bookmark').onclick=()=>{const b=readBookmark();if(!b){buttons();message('No valid saved bookmark is available.');return}show(b.chapter,false);requestAnimationFrame(()=>{const c=chapters[b.chapter];window.scrollTo({top:window.scrollY+c.getBoundingClientRect().top+c.offsetHeight*b.fraction-q('.reader-tools').offsetHeight});message(`Resumed chapter ${b.chapter+1}.`)})};
q('#clear-bookmark').onclick=()=>{try{localStorage.removeItem(key);buttons();message('Bookmark cleared for this book.')}catch{message('Could not clear the bookmark because browser storage is unavailable.')}};
q('.reader-tools').hidden=false;q('.reader-pagination').hidden=false;
try{const size=localStorage.getItem('studykit-reading-size');if(['18','21','25','29'].includes(size)){q('#reader-size').value=size;root.style.setProperty('--book-size',size+'px')}}catch{}
const match=location.hash.match(/^#chapter-(\d+)$/);show(match?Number(match[1])-1:0,false);const b=buttons();if(b)message(`Saved place available in chapter ${b.chapter+1}. Choose Resume bookmark to continue.`);
window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#chapter-(\d+)$/);if(m)show(Number(m[1])-1)});
})();
