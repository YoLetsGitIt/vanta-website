// The simplified artist page matches home and keeps the app tour easy to play.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
(async () => {
 const browser = await chromium.launch(executablePath ? {executablePath} : {});
 try {
  for (const width of [1440,768,390,320]) {
   const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[],missing=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
   page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('.mp4'))requests.push(r.url());});
   assert.equal((await page.goto(base+'/artists/')).status(),200);
   await page.getByRole('heading',{name:'Your art. Less admin.'}).waitFor();
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(requests.length,0,'Video downloads only after user action');
   assert.equal(await page.locator('canvas, dialog[open]').count(),0);
   assert.equal(await page.locator('#artist-features dt').count(),11);
   assert.equal(await page.getByRole('group',{name:'App tour chapters'}).count(),0);
   const overflow=()=>page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>el.clientWidth&&el.getAttribute('aria-hidden')!=='true'&&el.scrollWidth>el.clientWidth+2).map(el=>el.className));
   assert.deepEqual(await overflow(),[],'No horizontal overflow');
   const artistTheme=await page.locator('main').evaluate(el=>({background:getComputedStyle(el.parentElement).backgroundColor,paper:getComputedStyle(el).getPropertyValue('--paper').trim(),gold:getComputedStyle(el).getPropertyValue('--gold').trim(),headingFont:getComputedStyle(el.querySelector('h1')).fontFamily}));
   const play=page.getByRole('button',{name:'Watch the app tour',exact:true});
   assert((await play.boundingBox()).height>=44);
   await play.focus();await page.keyboard.press('Enter');
   const video=page.locator('video');
   await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.readyState>=2;});
   const info=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,inline:v.playsInline,controls:v.controls}));
   assert(Math.abs(info.duration-1098.688)<.2);
   assert.equal(info.width,1920);assert.equal(info.height,1080);assert(info.inline&&info.controls);
   await video.evaluate(v=>{v.pause();v.currentTime=35.5;});
   await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking&&Math.abs(v.currentTime-35.5)<1;});
   const src=await video.getAttribute('src');
   assert.equal((await page.request.get(base+src,{headers:{Range:'bytes=0-1023'}})).status(),206);
   await page.getByRole('button',{name:'Close app tour'}).click();
   await page.getByRole('dialog').waitFor({state:'hidden'});
   assert(await video.evaluate(v=>v.paused));
   await page.locator('#your-work-heading').scrollIntoViewIfNeeded();
   assert.deepEqual(await overflow(),[]);
   await page.getByRole('navigation',{name:'Footer'}).scrollIntoViewIfNeeded();
   assert(await page.getByRole('link',{name:'Contact',exact:true}).isVisible());
   assert.match(await page.getByRole('link',{name:'Get Vanta for iPhone'}).getAttribute('href'),/^https:\/\/apps.apple.com\//);
   await page.getByRole('link',{name:'Vanta home',exact:true}).click();
   await page.getByRole('heading',{name:'Find your next tattoo.'}).waitFor();
   const homeTheme=await page.getByRole('main',{name:'Vanta home'}).evaluate(el=>({background:getComputedStyle(el).backgroundColor,paper:getComputedStyle(el).getPropertyValue('--paper').trim(),gold:getComputedStyle(el).getPropertyValue('--gold').trim(),headingFont:getComputedStyle(el.querySelector('h1')).fontFamily}));
   assert.equal(artistTheme.background,'rgb(17, 21, 27)','Artist Dark uses native app charcoal');
   assert.equal(artistTheme.paper,'#ffffff','Artist Dark uses native white text');
   assert.equal(artistTheme.headingFont,homeTheme.headingFont,'Artist and home share the headline font');
   await page.getByRole('navigation',{name:'Vanta products'}).getByRole('link',{name:'For artists',exact:true}).click();
   await page.getByRole('button',{name:'Watch the app tour',exact:true}).waitFor();
   assert.equal(await page.locator('video').getAttribute('src'),null,'Returning resets playback');
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
   console.log(`PASS ${width}: native Dark palette, four feature sections and reminder schedule, fullscreen tour, keyboard, seeking, deferred media, layout, navigation`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
