'use strict';
function parseFlashcards(text){
 if(typeof text!=='string'||!text.trim())throw Error('Paste at least one question: answer line.');
 if(text.length>100000)throw Error('Use up to 100,000 characters at a time.');
 const cards=[],invalid=[];
 text.split(/\r?\n/).forEach((line,i)=>{if(!line.trim())return;const p=line.indexOf(':');if(p<1||!line.slice(0,p).trim()||!line.slice(p+1).trim()){invalid.push(i+1);return}cards.push({front:line.slice(0,p).trim(),back:line.slice(p+1).trim(),status:'new'})});
 if(invalid.length)throw Error('Add a question and answer separated by a colon on line'+(invalid.length>1?'s ':' ')+invalid.slice(0,12).join(', ')+(invalid.length>12?'…':'')+'. Your current deck has not changed.');
 if(cards.length>200)throw Error('Use up to 200 cards per deck.');
 return cards;
}
function paragraphFlashcards(text){
 if(typeof text!=='string'||!text.trim())throw Error('Paste a paragraph first.');
 if(text.length>100000)throw Error('Use up to 100,000 characters at a time.');
 const chunks=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(text)].map(x=>x.segment):text.split(/(?<=[.!?۔])\s+/u);
 const sentences=chunks.flatMap(x=>x.split(/\n+/)).map(x=>x.trim()).filter(Boolean);
 const cards=[];let skipped=0;const seen=new Set();
 for(const sentence of sentences){
  const words=sentence.match(/[\p{L}\p{N}][\p{L}\p{N}’'-]*/gu)||[];
  if(words.length<3){skipped++;continue}
  if(seen.has(sentence))continue;seen.add(sentence);
  let front,back;const m=sentence.replace(/[.!?۔]+$/u,'').match(/^(.{1,90}?)\s+(is|are|was|were)\s+(.+)$/iu);
  if(m&&!/^(it|this|that|they|these|those|he|she|there|what|who|where)\b/i.test(m[1])&&m[1].split(/\s+/).length<=10&&!/[,:;!?]/.test(m[1])){
   front=`According to the notes, what ${m[2].toLowerCase()} ${m[1]}?`;back=m[3];
  }else{
   const stop=new Set('the and that this with from have has were been into their there which would could should about then than they them these those'.split(' '));
   const candidates=words.filter(w=>w.length>=4&&!stop.has(w.toLowerCase()));
   const answer=(candidates.length?candidates:words).reduce((a,b)=>b.length>a.length?b:a);
   const start=sentence.indexOf(answer);front='Which word completes this sentence?\n'+sentence.slice(0,start)+'_____'+sentence.slice(start+answer.length);back=answer;
  }
  cards.push({front,back,status:'new'});
 }
 if(!cards.length)throw Error('Add at least one sentence with three or more words.');
 if(cards.length>200)throw Error('This paragraph produces more than 200 cards. Paste a shorter section.');
 return {cards,skipped};
}
if(typeof module!=='undefined')module.exports={parseFlashcards,paragraphFlashcards};
if(typeof document!=='undefined'&&document.querySelector('[data-tool="flashcard-maker"]')){
 const controls=document.querySelector('#controls'),result=document.querySelector('#result');
 controls.innerHTML=`<div class="flash-intro"><span class="eyebrow">FREE · NO AI · NO ACCOUNT</span><p>Paste an ordinary paragraph to make revision questions. Definition sentences become question–answer cards; other sentences become missing-word questions. Review and edit the results: these rules do not understand or fact-check your notes.</p></div><label>Input format<select id="flash-mode"><option value="paragraph">Paragraph → automatic questions</option><option value="pairs">Question: answer pairs</option></select></label><p id="flash-mode-help">Paste a paragraph with complete sentences. English definitions work best; other text uses missing-word prompts.</p><label for="flash-input">Your notes</label><textarea id="flash-input" spellcheck="false" placeholder="RAM is temporary memory used by a computer. The CPU processes instructions. Plants use sunlight to make food."></textarea><div class="actions"><button type="button" class="primary" id="make-cards">Create flashcards</button><button type="button" id="sample-cards">Try sample notes</button></div><p class="gpa-note">Paragraphs or one question: answer per line · Up to 200 cards · Creating a new deck replaces the current deck and resets its progress. Cards are not saved when you reload or leave.</p><section id="flash-deck" hidden><div class="sectiontop"><h2>Your revision deck</h2><label>Show cards<select id="flash-filter"><option value="all">All cards</option><option value="again">Review again</option><option value="known">Remembered</option><option value="new">Not marked yet</option></select></label></div><p id="flash-progress" aria-live="polite"></p><div class="actions"><button type="button" id="shuffle-cards">Shuffle</button><button type="button" id="reset-cards">Reset progress</button></div><div id="flash-empty" hidden><p>No cards in this view. Choose another view to keep studying.</p></div><div id="flash-active"><p id="flash-position"></p><button type="button" class="flashcard" id="flip-card" aria-label="Reveal answer"><span class="category" id="flash-side">QUESTION</span><span id="flash-content" dir="auto"></span><span class="flash-hint" id="flash-hint">Click or press Enter to reveal the answer</span></button><div class="actions flash-nav"><button type="button" id="previous-card">Previous</button><button type="button" id="next-card">Next</button><button type="button" id="edit-card">Edit card</button></div><div class="actions"><button type="button" id="mark-again">Review again</button><button type="button" class="primary" id="mark-known">I remember this</button></div><div id="flash-editor" hidden><label for="edit-front">Question / term</label><textarea id="edit-front" rows="3"></textarea><label for="edit-back">Answer / definition</label><textarea id="edit-back" rows="4"></textarea><div class="actions"><button type="button" class="primary" id="save-card">Save changes</button><button type="button" id="cancel-edit">Cancel</button></div></div></div></section>`;
 const q=s=>controls.querySelector(s);let cards=[],order=[],position=0,flipped=false,editing=null;
 function message(text,error=false){result.classList.toggle('error',error);result.textContent=text}
 function visible(){let f=q('#flash-filter').value;return order.filter(i=>f==='all'||cards[i].status===f)}
 function current(){return visible()[position]}
 function draw(){const ids=visible();position=Math.min(Math.max(0,position),Math.max(0,ids.length-1));q('#flash-deck').hidden=!cards.length;q('#flash-empty').hidden=!!ids.length;q('#flash-active').hidden=!ids.length;q('#flash-progress').textContent=`${cards.length} cards · ${cards.filter(c=>c.status==='known').length} remembered · ${cards.filter(c=>c.status==='again').length} to review · ${cards.filter(c=>c.status==='new').length} not marked`;
 q('#flash-editor').hidden=true;editing=null;
 if(!ids.length)return;const c=cards[ids[position]];q('#flash-position').textContent=`Card ${position+1} of ${ids.length} in this view · ${c.status==='known'?'Remembered':c.status==='again'?'Review again':'Not marked'}`;q('#flash-content').textContent=flipped?c.back:c.front;q('#flash-side').textContent=flipped?'ANSWER':'QUESTION';q('#flash-hint').textContent=flipped?'Click or press Enter to return to the question':'Click or press Enter to reveal the answer';q('#flip-card').classList.toggle('answer',flipped);q('#flip-card').setAttribute('aria-label',flipped?'Show question':'Reveal answer');q('#previous-card').disabled=position===0;q('#next-card').disabled=position===ids.length-1;}
 q('#make-cards').onclick=()=>{try{const paragraph=q('#flash-mode').value==='paragraph';const generated=paragraph?paragraphFlashcards(q('#flash-input').value):{cards:parseFlashcards(q('#flash-input').value),skipped:0};cards=generated.cards;order=cards.map((_,i)=>i);position=0;flipped=false;q('#flash-filter').value='all';draw();message(`${cards.length} flashcards created.${generated.skipped?" Skipped "+generated.skipped+" short sentence(s).":""} Review the wording and answers before studying.`);q('#flip-card').focus()}catch(e){message(e.message,true)}};
 q('#flash-mode').onchange=()=>{q('#flash-mode-help').textContent=q('#flash-mode').value==='paragraph'?'Paste a paragraph with complete sentences. English definitions work best; other text uses missing-word prompts.':'Put one question: answer pair on each line. Only the first colon separates the two sides.';message('Input mode changed. Creating cards will replace the current deck.')};
 q('#sample-cards').onclick=()=>{q('#flash-input').value=q('#flash-mode').value==='paragraph'?'RAM is temporary memory used by a computer. The CPU processes instructions. Plants use sunlight to make food.':'RAM: Temporary memory used by a computer\nSGPA: Semester grade point average';message('Sample notes added. Choose Create flashcards to build the deck.')};
 q('#flip-card').onclick=()=>{flipped=!flipped;draw()};
 q('#previous-card').onclick=()=>{position--;flipped=false;draw()};q('#next-card').onclick=()=>{position++;flipped=false;draw()};
 q('#flash-filter').onchange=()=>{position=0;flipped=false;draw()};
 q('#shuffle-cards').onclick=()=>{for(let i=order.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}position=0;flipped=false;draw();message('Cards shuffled. Your progress is preserved.')};
 q('#reset-cards').onclick=()=>{cards.forEach(c=>c.status='new');q('#flash-filter').value='all';position=0;flipped=false;draw();message('Progress reset. All cards are unmarked.')};
 function mark(status){const id=current();if(id===undefined)return;cards[id].status=status;const f=q('#flash-filter').value;if(f==='all'||f===status)position=Math.min(position+1,visible().length-1);flipped=false;draw();message(status==='known'?'Marked as remembered.':'Marked for another review.')}
 q('#mark-again').onclick=()=>mark('again');q('#mark-known').onclick=()=>mark('known');
 q('#edit-card').onclick=()=>{editing=current();if(editing===undefined)return;q('#edit-front').value=cards[editing].front;q('#edit-back').value=cards[editing].back;q('#flash-editor').hidden=false;q('#edit-front').focus()};q('#cancel-edit').onclick=()=>{editing=null;q('#flash-editor').hidden=true};
 q('#save-card').onclick=()=>{if(editing===null)return;const front=q('#edit-front').value.trim(),back=q('#edit-back').value.trim();if(!front||!back){message('Both question and answer are required. Your card has not changed.',true);return}cards[editing]={front,back,status:'new'};flipped=false;draw();message('Card updated and marked for a fresh review. The pasted source notes are unchanged.')};
 message('Paste your notes or try the sample to begin.');
}
