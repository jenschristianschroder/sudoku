const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const helpers=script.slice(script.indexOf('  function localDay('),script.indexOf('  function correctPlaysFor('));
const completion=script.slice(script.indexOf('  function checkComplete('),script.indexOf('  function renderDifficultyNav('));
const local=(day,hour=12)=>new Date(2026,9,day,hour).getTime();
const games=(...days)=>days.map(day=>({completedAt:local(day)}));
function harness(history=[],now=local(30)){
  let clock=now;
  class Clock extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return clock}}
  const elements=new Map();
  const $=selector=>{if(!elements.has(selector))elements.set(selector,{textContent:'',dataset:{},setAttribute(name,value){this[name]=value}});return elements.get(selector)};
  const context=vm.createContext({Date:Clock,$,data:{games:history},displayedDay:null,saves:0,renders:0,game:null,toast(){}});
  vm.runInContext(`${helpers}\n${completion}\nfunction saveData(){saves++}\nfunction render(){renderDailyStreak()}\nfunction renderStats(){renders++;renderDailyStreak()}`,context);
  return {context,$,setNow(value){clock=value},progress(gs=history){return JSON.parse(JSON.stringify(context.dailyProgress(gs)))}};
}
test('empty history has no streak and today remains incomplete',()=>{
  assert.deepEqual(harness().progress(),{streak:0,completedToday:false});
});
test('one or multiple completions on a day count once, regardless of order',()=>{
  assert.deepEqual(harness(games(29,30,28,30,29)).progress(),{streak:3,completedToday:true});
});
test('yesterday keeps the streak alive until today ends; a missed day resets it',()=>{
  const h=harness(games(28,29));
  assert.deepEqual(h.progress(),{streak:2,completedToday:false});
  h.setNow(local(31,0));
  assert.deepEqual(h.progress(),{streak:0,completedToday:false});
});
test('a gap of less than 48 hours still resets if a calendar day was missed',()=>{
  const h=harness([{completedAt:local(28,23)},{completedAt:local(30,0)}],local(30,1));
  assert.equal(h.progress().streak,1);
});
test('consecutive days count across month/year boundaries and DST',()=>{
  for(const dates of [[new Date(2026,11,31,23),new Date(2027,0,1,1)], [new Date(2026,9,24,12),new Date(2026,9,25,12)]]){
    const h=harness(dates.map(d=>({completedAt:d.getTime()})),dates[1].getTime());
    assert.equal(h.progress().streak,2);
  }
});
test('invalid, missing and future timestamps cannot extend a streak',()=>{
  const h=harness([...games(29,30,31),{},{completedAt:null},{completedAt:'invalid'}]);
  assert.deepEqual(h.progress(),{streak:2,completedToday:true});
});
test('completion updates today, persists the streak, and cannot be counted twice',()=>{
  const h=harness(games(29));
  h.context.game={id:'test',level:0,elapsed:90,hints:0,mistakes:0,puzzle:[0],solution:[1],board:[1]};
  h.context.checkComplete();
  h.context.checkComplete();
  assert.equal(h.context.data.games.length,2);
  assert.equal(h.context.data.streak,2);
  assert.equal(h.context.saves,1);
  assert.equal(h.$('#dailyGoal').textContent,'Today: 1/1 ✓');
  assert.equal(h.$('#dailyStreak').dataset.complete,'true');
});
test('unfinished boards do not advance the goal',()=>{
  const h=harness();
  h.context.game={finished:false,board:[0],solution:[1]};
  h.context.checkComplete();
  assert.equal(h.context.data.games.length,0);
  assert.equal(h.context.saves,0);
});
test('midnight refreshes the goal even when no puzzle is running',()=>{
  const h=harness(games(29,30));
  h.context.renderDailyStreak();
  h.setNow(local(31,0));
  h.context.refreshDailyProgress();
  assert.equal(h.$('#dailyGoal').textContent,'Today: 0/1');
  assert.equal(h.$('#streakValue').textContent,2);
  assert.equal(h.$('#dailyStreak').dataset.complete,'false');
  h.setNow(new Date(2026,10,1).getTime());
  h.context.refreshDailyProgress();
  assert.equal(h.$('#streakValue').textContent,0);
  assert.equal(h.context.renders,2);
});
