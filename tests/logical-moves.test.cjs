const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const logic=script.slice(script.indexOf('  // Logical analysis'),script.indexOf('  function newGame('));
const {analyzeLogicalMoves,eliminateLogicalFish}=vm.runInNewContext(`${logic}\n({analyzeLogicalMoves,eliminateLogicalFish})`);
const digits=s=>Array.from(s,Number);
const solution=digits('319845762645217398827963451478129635231576849596384217962458173783691524154732986');
const locked=digits('310000700640200300027060000070000035231506840090080200962458173783601000154730000');
const wings=digits('310000700640200300027063000070000035231506840090380200962458173783601000154730000');
const stuck=digits('310040700640200300027063000070000035231506840090380200962458173783601000154730000');

// Independent direct-constraint solver verifies that returned numbers are forced.
function options(board,i){
  const r=Math.floor(i/9),c=i%9;
  return [1,2,3,4,5,6,7,8,9].filter(n=>{
    for(let k=0;k<9;k++)if(board[r*9+k]===n||board[k*9+c]===n||board[Math.floor(r/3)*27+Math.floor(c/3)*3+Math.floor(k/3)*9+k%3]===n)return false;
    return true;
  });
}
function hasCompletion(board){
  let best=-1,values=[];
  for(let i=0;i<81;i++)if(!board[i]){
    const next=options(board,i);
    if(!next.length)return false;
    if(best<0||next.length<values.length){best=i;values=next;if(next.length===1)break}
  }
  if(best<0)return true;
  return values.some(n=>{const next=board.slice();next[best]=n;return hasCompletion(next)});
}
function assertForced(board){
  const result=analyzeLogicalMoves(Object.freeze(board.slice()));
  assert.equal(result.status,'move');
  assert.equal(board[result.cell],0);
  assert.ok(options(board,result.cell).includes(result.value));
  const next=board.slice();next[result.cell]=result.value;
  assert.ok(hasCompletion(next));
  for(const n of options(board,result.cell))if(n!==result.value){
    next[result.cell]=n;
    assert.equal(hasCompletion(next),false,`Cell ${result.cell} must exclude ${n}`);
  }
}
function hasSingle(board){
  const choices=board.map((n,i)=>n?[]:options(board,i));
  if(choices.some(ns=>ns.length===1))return true;
  for(let u=0;u<9;u++){
    const row=Array.from({length:9},(_,k)=>u*9+k),col=Array.from({length:9},(_,k)=>k*9+u);
    const box=Array.from({length:9},(_,k)=>Math.floor(u/3)*27+u%3*3+Math.floor(k/3)*9+k%3);
    for(const unit of [row,col,box])for(let n=1;n<=9;n++)if(unit.filter(i=>choices[i].includes(n)).length===1)return true;
  }
  return false;
}
test('an empty cell with one possible number is a logical move',()=>{
  const board=solution.slice();board[40]=0;
  assertForced(board);
});
test('hidden singles count even when every empty cell has multiple candidates',()=>{
  for(const text of [
    '009000002000007000007900451400000030000070049090000200000000100083001504150002900',
    '300040002040007008007963400070020000000000800506000207060408003000690000000002000'
  ]){
    const board=digits(text);
    assert.ok(board.every((n,i)=>n||options(board,i).length>1));
    assertForced(board);
  }
});
test('candidate eliminations lead to forced moves on boards without any singles',()=>{
  for(const board of [locked,wings]){
    assert.equal(hasSingle(board),false);
    assertForced(board);
    // Deductions must not depend on a particular digit order or orientation.
    const transpose=board.map((_,i)=>board[i%9*9+Math.floor(i/9)]);
    assertForced(transpose);
    assertForced(board.map(n=>n?10-n:0));
  }
});
test('a saved unique answer does not count as a visible logical move',()=>{
  assert.equal(analyzeLogicalMoves(stuck).status,'stuck');
  assert.equal(analyzeLogicalMoves(Array(81).fill(0)).status,'stuck');
  // This actual placement opens a new forced move; it is not a note.
  const next=stuck.slice();next[2]=9;
  assertForced(next);
});
test('fish eliminate only the reserved digit outside their base rows or columns',()=>{
  for(const size of [2,3,4])for(const transpose of [false,true]){
    const bases=[0,2,4,6].slice(0,size),covers=[1,3,5,7].slice(0,size),bit=1<<5;
    const at=(r,c)=>transpose?c*9+r:r*9+c,candidates=Array(81).fill(1022);
    // Each base has two possible places for 5, forming a closed cycle.
    bases.forEach((r,k)=>{for(let c=0;c<9;c++)if(c!==covers[k]&&c!==covers[(k+1)%size])candidates[at(r,c)]&=~bit});
    const before=candidates.slice();
    assert.equal(eliminateLogicalFish(candidates),true);
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){
      const i=at(r,c),expected=!bases.includes(r)&&covers.includes(c)?before[i]&~bit:before[i];
      assert.equal(candidates[i],expected,`Fish size ${size}, transpose ${transpose}, cell ${i}`);
    }
  }
});
test('complete, malformed and contradictory boards are not called stuck',()=>{
  assert.equal(analyzeLogicalMoves(solution).status,'complete');
  for(const board of [[],Array(81).fill(10),Array(81).fill(null),Array(81).fill(1)])assert.equal(analyzeLogicalMoves(board).status,'invalid');
  const duplicate=solution.slice();duplicate[0]=duplicate[1];
  assert.equal(analyzeLogicalMoves(duplicate).status,'invalid');
  const noCandidate=Array(81).fill(0);noCandidate.splice(0,8,1,2,3,4,5,6,7,8);noCandidate[17]=9;
  assert.equal(analyzeLogicalMoves(noCandidate).status,'invalid');
});

function appHarness(board=stuck){
  const label={hidden:true,textContent:''};
  const state={
    game:{board:board.slice(),puzzle:Array(81).fill(0),solution:solution.slice(),notes:Array.from({length:81},()=>[]),finished:false,mistakes:0,hints:0,correctMoves:0},
    data:{},selected:2,notesMode:false,paused:false,undoStack:[],
    $:selector=>selector==='#logicalStatus'?label:null,
    saveData(){},checkComplete(){},toast(){},
  };
  const actions=script.slice(script.indexOf('  function enter('),script.indexOf('  function checkComplete('));
  const pause=script.slice(script.indexOf('  function setPaused('),script.indexOf('  async function refreshApp('));
  vm.createContext(state);
  vm.runInContext(`${logic}\n${actions}\n${pause}\nfunction render(){renderLogicalStatus()}\nrender()`,state);
  return {state,label,run:code=>vm.runInContext(code,state)};
}
test('label shows below the board and ignores pencil notes and stale mistake counts',()=>{
  assert.match(html,/<div class="board-number-pad"><p class="logical-status" id="logicalStatus" role="status" aria-live="polite" aria-atomic="true" hidden>/);
  assert.match(script,/renderBoard\(\);renderNumbers\(\);renderLogicalStatus\(\)/);
  const {state,label,run}=appHarness();
  assert.equal(label.hidden,false);
  assert.equal(label.textContent,'No logical moves found — guessing may be needed.');
  run('notesMode=true;enter(9)');
  assert.equal(state.game.board[2],0);
  assert.deepEqual(Array.from(state.game.notes[2]),[9]);
  assert.equal(label.hidden,false);
  state.game.mistakes=3;run('render()');
  assert.equal(label.hidden,false);
});
test('entry, undo, erase and hints recompute the label from the current numbers',()=>{
  const {state,label,run}=appHarness();
  run('enter(9)');assert.equal(label.hidden,true);
  run('undo()');assert.equal(label.hidden,false);
  run('enter(9);erase()');assert.equal(label.hidden,false);
  run('undo()');assert.equal(label.hidden,true);
  run('undo()');assert.equal(label.hidden,false);
  run('hint()');assert.equal(label.hidden,true);
  assert.equal(state.game.hints,1);
  run('undo()');assert.equal(label.hidden,false);
});
test('pause, completion and incorrect entries hide the label until resolved',()=>{
  const {state,label,run}=appHarness();
  run('setPaused(true)');assert.equal(label.hidden,true);assert.equal(label.textContent,'');
  run('setPaused(false)');assert.equal(label.hidden,false);
  // 8 does not immediately duplicate a peer, but is an existing highlighted mistake.
  assert.ok(options(state.game.board,2).includes(8));
  run('enter(8)');assert.equal(label.hidden,true);
  run('erase()');assert.equal(label.hidden,false);
  state.game.finished=true;run('render()');assert.equal(label.hidden,true);
  state.game.finished=false;state.game.board=solution.slice();run('render()');assert.equal(label.hidden,true);
});
test('restored boards are analyzed without altering their numbers or notes',()=>{
  for(const board of [stuck,locked]){
    const {state,label,run}=appHarness(board),before=JSON.stringify(state.game);
    run('render();render()');
    assert.equal(label.hidden,board!==stuck);
    assert.equal(JSON.stringify(state.game),before);
  }
});
