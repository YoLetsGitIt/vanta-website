// Local artist theme review: palette changes, persistence, keyboard and media boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.PUBLIC_TEST_URL || 'http://127.0.0.1:3048';
const output = process.env.ARTIST_REVIEW_OUTPUT || '/private/tmp/vanta-artist-appearance-review';
const key = 'vanta-artist-preview-theme';
const themes = ['dark','light','nature','space'];
const expectedCanvas = { dark:'#11151b', light:'#fafaf8', nature:'#e3ddcc', space:'#0d0b1a' };
function contrast(a,b) {
  const light = hex => { const value = hex.replace('#',''); const rgb = (value.length === 3 ? [...value].map(n=>n+n).join('') : value).match(/../g).slice(0,3).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
  return (Math.max(light(a),light(b))+.05)/(Math.min(light(a),light(b))+.05);
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
 try {
  const results=[];
  for (const width of [1440,768,390,320]) {
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
   const errors=[],missing=[],media=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push(r.url());});
   page.on('request',r=>{if(r.url().endsWith('.mp4'))media.push(r.url());});
   await page.goto(base+'/artists/');
   const picker=page.getByRole('radiogroup',{name:'Appearance'});
   const trigger=page.getByRole('button',{name:/^Change theme/});
   await trigger.waitFor();
   assert(await trigger.evaluate(el=>!!el.closest('header')),'Theme control belongs to navbar');
   await trigger.click(); await picker.waitFor();
   const menuBox=await page.locator('#artist-theme-menu').boundingBox();
   assert(menuBox.x>=0&&menuBox.x+menuBox.width<=width,'Theme menu fits viewport');
   await page.screenshot({path:path.join(output,`navbar-menu-${width}.png`)});
   const artwork=await page.locator('#artist-tour img:not([data-native-screenshot])').evaluateAll(imgs=>imgs.map(img=>img.src));
   for (const theme of themes) {
    if(!await picker.isVisible())await trigger.click();
    await picker.getByRole('radio',{name:theme,exact:false}).click();
    await page.waitForFunction(theme=>document.querySelector('[data-theme]').dataset.theme===theme,theme);
    assert.equal(await picker.locator('[aria-checked="true"]').count(),1);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),theme);
    const roles=await page.locator('[data-theme]').evaluate(el=>{
     const css=getComputedStyle(el), read=name=>css.getPropertyValue(name).trim();
     return {canvas:read('--canvas'),text:read('--paper'),muted:read('--muted'),cta:read('--cta'),onCta:read('--on-cta'),appCanvas:read('--app-canvas'),appText:read('--app-text')};
    });
    assert.equal(roles.appCanvas,expectedCanvas[theme]);
    if(theme==='dark') { assert.equal(roles.canvas,roles.appCanvas,'Website Dark matches native app charcoal'); assert.equal(roles.text,roles.appText); assert.equal(roles.cta,'#ffffff'); assert.equal(roles.onCta,'#000000'); }
    const ratios={text:contrast(roles.text,roles.canvas),muted:contrast(roles.muted,roles.canvas),cta:contrast(roles.onCta,roles.cta),appText:contrast(roles.appText,roles.appCanvas)};
    for(const [role,ratio] of Object.entries(ratios))assert(ratio>=4.5,`${width}/${theme}: ${role} contrast ${ratio}`);
    assert.deepEqual(await page.locator('#artist-tour img:not([data-native-screenshot])').evaluateAll(imgs=>imgs.map(img=>img.src)),artwork,'Themes never swap or recolour tattoo photography');
    assert(await page.locator('#artist-tour img').evaluateAll(imgs=>imgs.every(img=>getComputedStyle(img).filter==='none')));
    assert.equal(await page.locator('[data-app-preview]').count(),12,'Every app preview uses the chosen appearance');
    const captures = page.locator('[data-native-capture]');
    assert(await captures.evaluateAll((nodes, theme) => nodes.every(node => node.dataset.captureTheme === theme && node.querySelector('img').getAttribute('src').includes(`-${theme}-780.webp`)), theme), 'Feed, profile and detail captures follow the selected theme');
    await captures.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    assert(await captures.locator('img').evaluateAll(imgs=>imgs.every(img=>img.naturalWidth>0 && getComputedStyle(img).filter==='none')), 'All native variants load without colour filters');
    assert(await page.locator('main').evaluate(el=>el.parentElement.scrollWidth<=el.parentElement.clientWidth+1),'No page overflow');
    for(const radio of await picker.getByRole('radio').all())assert((await radio.boundingBox()).height>=44);
    assert.deepEqual(media,[],'Theme changes never download or start the video');
    for(const motif of ['nature','space']) {
     const visible=await page.locator(`[data-motif="${motif}"]`).evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=='none').length);
     // Section 04 uses native captures with their own rendered theme accents.
     const accents = await page.locator('[data-theme-accent]').count();
     assert.equal(visible,theme===motif?accents:0,'Only matching page and app vectors appear');
    }
    const nativePreview=page.locator('#your-day [data-app-preview="calendar"]');
    assert.equal(await nativePreview.locator(`[data-day-screen]:not([hidden]) img[data-native-theme="${theme}"]`).evaluate(el=>getComputedStyle(el).opacity),'1','Native Bookings capture matches selected theme');
    assert.equal(await nativePreview.locator('[data-day-screen]:not([hidden]) img').evaluateAll(imgs=>imgs.filter(el=>getComputedStyle(el).opacity==='1').length),1,'Exactly one native theme is visible');
    assert(await page.locator('[data-theme-accent]').evaluateAll(nodes=>nodes.every(el=>el.getAttribute('aria-hidden')==='true'&&getComputedStyle(el).pointerEvents==='none')));
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'),'false');
    assert(await trigger.evaluate(el=>el===document.activeElement));
    if(width===1440||width===390){
     await page.locator('#artist-tour img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
     await page.screenshot({path:path.join(output,`${theme}-${width}-opening.png`)});
     await page.addStyleTag({content:'html, body {height:auto!important;overflow:visible!important;} [class*="artists_navigation"] {position:relative!important;} [class*="artists_skipLink"] {visibility:hidden!important;}'});
     await page.locator('[data-theme]').evaluate(el=>{el.style.height='auto';el.style.overflow='visible';});
     await page.getByRole('region',{name:'Your art. Less admin.'}).screenshot({path:path.join(output,`${theme}-${width}-splash.png`)});
     if(theme==='light'||theme==='space'||theme==='dark')await page.locator('#your-day').screenshot({path:path.join(output,`${theme}-${width}-calendar.png`)});
     if(theme==='dark')await page.getByRole('region',{name:'Reminders, handled.'}).screenshot({path:path.join(output,`dark-${width}-reminders.png`)});
     await page.locator('[data-theme]').evaluate(el=>{el.style.height='100dvh';el.style.overflow='auto';el.scrollTop=0;});
    }
    results.push({width,theme,ratios});
   }
   await trigger.click();
   const dark=picker.getByRole('radio',{name:'Dark',exact:true});
   await dark.click();await dark.focus();await page.keyboard.press('ArrowRight');
   assert.equal(await page.getByRole('radio',{name:'Light',exact:true}).getAttribute('aria-checked'),'true');
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Light');
   await page.keyboard.press('End');assert.equal(await page.getByRole('radio',{name:'Space',exact:true}).getAttribute('aria-checked'),'true');
   await page.reload();await page.waitForFunction(()=>document.querySelector('[data-theme]').dataset.theme==='space');
   await trigger.click();
   assert.equal(await page.getByRole('radio',{name:'Space',exact:true}).getAttribute('aria-checked'),'true');
   await page.mouse.click(8,120);
   assert.equal(await trigger.getAttribute('aria-expanded'),'false','Clicking outside dismisses menu');
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
   console.log(`PASS ${width}: navbar themes, native vector motifs, page/app contrast, unchanged artwork, no overflow, deferred video, keyboard and reload persistence`);
   await page.close();
  }
  const context=await browser.newContext();
  const page=await context.newPage(),second=await context.newPage();
  await page.goto(base+'/artists/');await second.goto(base+'/artists/');
  await page.getByRole('button',{name:/^Change theme/}).click();
  await page.getByRole('radio',{name:'Nature',exact:true}).click();
  await second.waitForFunction(()=>document.querySelector('[data-theme]').dataset.theme==='nature');
  await page.evaluate(key=>localStorage.setItem(key,'invalid'),key);await page.reload();
  await page.getByRole('button',{name:/^Change theme/}).click();
  await page.getByRole('radio',{name:'Dark',exact:true}).waitFor();
  assert.equal(await page.getByRole('radio',{name:'Dark',exact:true}).getAttribute('aria-checked'),'true');
  console.log('PASS theme sync between tabs and safe fallback for invalid stored values');
  await context.close();
  const blocked=await browser.newPage();
  await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Disabled','SecurityError');}});});
  await blocked.goto(base+'/artists/');await blocked.getByRole('button',{name:/^Change theme/}).click();await blocked.getByRole('radio',{name:'Light',exact:true}).click();
  await blocked.waitForFunction(()=>document.querySelector('[data-theme]').dataset.theme==='light');
  await blocked.keyboard.press('Escape');
  await blocked.getByRole('button',{name:'Watch the app tour',exact:true}).click();
  await blocked.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.readyState>=2;});
  await blocked.getByText('Narrated by Matthew, founder of Vanta',{exact:true}).waitFor();
  await blocked.getByRole('button',{name:'Close app tour'}).click();
  await blocked.getByRole('dialog').waitFor({state:'hidden'});assert(await blocked.locator('video').evaluate(v=>v.paused));
  console.log('PASS unavailable browser storage, themed-page fullscreen playback and paused close');
  await blocked.close();
  fs.writeFileSync(path.join(output,'contrast.json'),JSON.stringify(results,null,2)+'\n');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
