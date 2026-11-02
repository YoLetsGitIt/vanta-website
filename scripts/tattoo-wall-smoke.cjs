// Check rendered movement, not just the animation's enabled state.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
(async () => {
 const browser = await chromium.launch();
 try {
  for (const width of [1440,390]) for (const reducedMotion of ['no-preference','reduce']) {
   const page = await browser.newPage({ viewport:{width,height:900}, reducedMotion });
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('requestfailed',r=>console.error('REQUEST FAILED',r.url(),r.failure()));
   page.on('console',m=>{if(m.type()==='error')console.error('BROWSER ERROR',m.text());});
   await page.goto(base+'/');
   await page.bringToFront();
   const wall = page.locator('[data-running]');
   async function waitRunning(value) {
    try { await page.waitForFunction(v=>document.querySelector('[data-running]')?.dataset.running===v, String(value), {timeout:10000}); }
    catch(error) { console.error(await wall.evaluate(e=>({dataset:{...e.dataset},bounds:e.getBoundingClientRect().toJSON(),hidden:document.hidden,preference:matchMedia('(prefers-reduced-motion: reduce)').matches,ready:document.readyState,scroll:document.querySelector('main').scrollTop}))); console.error({width,reducedMotion,errors}); throw error; }
   }
   const positions = () => page.locator('[class*="wallTrack"]').evaluateAll(es => es.filter(e=>e.getClientRects().length).map(e => new DOMMatrixReadOnly(getComputedStyle(e).transform).m42));
   async function measure(moves) {
    // Let the compositor commit the requested pause/seek before sampling.
    await page.waitForTimeout(150);
    const before=await positions(); await page.waitForTimeout(700); const after=await positions();
    assert(before.every((y,i)=>moves ? Math.abs(y-after[i])>3 : Math.abs(y-after[i])<.1), `Actual movement ${moves}: ${before} -> ${after}`);
   }
   const moves=reducedMotion==='no-preference';
   await waitRunning(moves);
   assert.equal(await page.getByRole('button',{name:/^(Pause|Play) tattoo wall$/}).count(),0);
   await measure(moves);
   const initialBounds=await wall.boundingBox();
   await page.locator('#the-experience').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
   await waitRunning(moves);
   await measure(moves);
   const scrolledBounds=await wall.boundingBox();
   assert.equal(scrolledBounds.y,initialBounds.y,'Tattoo wall stays fixed behind the page');
   assert.equal(scrolledBounds.height,initialBounds.height);
   assert(await page.locator('main').evaluate(e=>e.scrollTop>500),'The app journey is below the opening gallery');
   await page.locator('main').evaluate(e=>e.scrollTo({top:0,behavior:'instant'}));
   await waitRunning(moves);
   await measure(moves);
   if(reducedMotion==='no-preference'){
    await page.emulateMedia({reducedMotion:'reduce'});
    await waitRunning(false);
    await measure(false);
   }
   assert(await page.locator('main').evaluate(e=>e.scrollWidth<=e.clientWidth));
   assert.deepEqual(errors,[]);
   await page.screenshot({path:`/tmp/vanta-wall-fixed-${width}-${reducedMotion}.png`});
   console.log(`PASS ${width} ${reducedMotion}: measured movement, continuous background, reduced-motion support, no playback button`);
   await page.close();
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
