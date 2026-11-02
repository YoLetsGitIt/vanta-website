// Public artist entry is a conventional page; the studio keeps its walkthrough.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
(async () => {
 const browser = await chromium.launch(executablePath ? {executablePath} : {});
 try {
  for (const width of [1440,390]) {
   const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/artists/');
   await page.getByRole('heading',{name:'Your art. Less admin.'}).waitFor();
   assert.equal(await page.locator('canvas').count(),0);
   assert.equal(await page.getByRole('button',{name:'Step inside',exact:true}).count(),0);
   await page.getByRole('navigation',{name:'Vanta products'}).getByRole('link',{name:'For studios',exact:true}).click();
   await page.getByRole('heading',{name:'From the first hello to the final detail.'}).waitFor();
   await page.getByRole('button',{name:'Step inside',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('[data-phase]')?.dataset.phase==='form');
   assert.equal(await page.locator('[data-phase]').first().getAttribute('data-audience'),'owner');
   await page.getByRole('navigation',{name:'Vanta products'}).getByRole('link',{name:'For artists',exact:true}).click();
   await page.getByRole('button',{name:'Watch the app tour',exact:true}).waitFor();
   await page.reload();
   await page.getByRole('heading',{name:'Your art. Less admin.'}).waitFor();
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}: direct artist entry, studio walkthrough, return navigation and reload`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
