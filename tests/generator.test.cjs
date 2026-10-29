const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Also check syntax of the complete application.
const levels=script.match(/const LEVELS=.*?;/)[0];
const functions=script.slice(script.indexOf('  function seeded('),script.indexOf('  function newGame('));
const {seeded,makePuzzle,hasRepeatedTriples}=vm.runInNewContext(`${levels}\n${functions}\n({seeded,makePuzzle,hasRepeatedTriples})`);
const screenshot=[159472836,274863915,368951427,792346158,581297364,643185279,917624583,426538791,835719642].flatMap(n=>String(n).split('').map(Number));
const transpose=b=>b.map((_,i)=>b[(i%9)*9+Math.floor(i/9)]);
function valid(b){
  const expected='123456789';
  for(let i=0;i<9;i++){
    for(const unit of [b.slice(i*9,i*9+9),Array.from({length:9},(_,j)=>b[j*9+i]),Array.from({length:9},(_,j)=>b[Math.floor(i/3)*27+(i%3)*3+Math.floor(j/3)*9+j%3])]){
      assert.equal(unit.sort().join(''),expected);
    }
  }
}
// Independent bit-mask counter; do not use the generator's own solver to verify uniqueness.
function countSolutions(board){
  const b=Array.from(board),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);
  const box=i=>Math.floor(i/27)*3+Math.floor((i%9)/3);
  b.forEach((n,i)=>{if(n){rows[Math.floor(i/9)]|=1<<n;cols[i%9]|=1<<n;boxes[box(i)]|=1<<n;}});
  function search(){
    let cell=-1,mask=0,size=10;
    for(let i=0;i<81;i++)if(!b[i]){
      const available=1022&~(rows[Math.floor(i/9)]|cols[i%9]|boxes[box(i)]);
      const count=available.toString(2).replace(/0/g,'').length;
      if(!count)return 0;
      if(count<size){cell=i;mask=available;size=count;}
    }
    if(cell<0)return 1;
    let total=0;const r=Math.floor(cell/9),c=cell%9,k=box(cell);
    for(let n=1;n<=9;n++)if(mask&(1<<n)){
      const bit=1<<n;b[cell]=n;rows[r]|=bit;cols[c]|=bit;boxes[k]|=bit;
      total+=search();b[cell]=0;rows[r]^=bit;cols[c]^=bit;boxes[k]^=bit;
      if(total>=2)return 2;
    }
    return total;
  }
  return search();
}
test('reject the reported board and its transposed pattern',()=>{
  valid(screenshot);
  assert.equal(hasRepeatedTriples(screenshot),true);
  assert.equal(hasRepeatedTriples(transpose(screenshot)),true);
});
test('500 seeded puzzles across all levels are valid, unique, and free of repeated partitions',()=>{
  const seen=new Set();
  for(let seed=1;seed<=100;seed++)for(let level=0;level<5;level++){
    const {puzzle,solution}=makePuzzle(level,seeded(seed*5+level));
    valid(solution);
    assert.equal(hasRepeatedTriples(solution),false);
    assert.equal(hasRepeatedTriples(transpose(solution)),false);
    assert.equal(countSolutions(puzzle),1);
    puzzle.forEach((n,i)=>{if(n)assert.equal(n,solution[i]);});
    assert.ok(puzzle.filter(Boolean).length>=[48,42,36,30,26][level]);
    assert.ok(puzzle.includes(0));
    seen.add(solution.join(''));
  }
  assert.equal(seen.size,500);
});
test('seeded generation is reproducible',()=>{
  assert.equal(JSON.stringify(makePuzzle(4,seeded(123))),JSON.stringify(makePuzzle(4,seeded(123))));
});
