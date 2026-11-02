const assert = require('node:assert/strict');
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT_PATH || 'playwright');
const site = process.env.PUBLIC_TEST_URL || 'http://localhost:4174';
const app = process.env.STUDIO_TEST_URL || 'http://localhost:4173';
(async () => {
 const browser = await chromium.launch();
 try {
  for (const viewport of (process.env.MOBILE_ONLY ? [{width:390,height:844}] : [{width:1440,height:900},{width:390,height:844}])) {
   for (const reducedMotion of ['reduce','no-preference']) {
    const page = await browser.newPage({ viewport, reducedMotion });
    try {
    const errors=[], missing=[];
    page.on('pageerror', e=>errors.push(e.message));
    page.on('response', r=>{ if(r.status()>=400 && [site,app].includes(new URL(r.url()).origin)) missing.push(r.url()); });
    await page.route('**/*',route=>[site,app].includes(new URL(route.request().url()).origin)?route.continue():route.fulfill({status:200,json:{}}));
    await page.goto(site+'/');
    assert.equal(await page.getByRole('link',{name:'For studios',exact:true}).getAttribute('href'),'/studio');
    assert.equal(await page.getByRole('navigation',{name:'For tattoo professionals'}).getByRole('link').count(),2);
    await page.getByRole('link',{name:'For studios',exact:true}).click();
    const root=page.locator('[data-phase]').first();
    await page.getByRole('heading',{name:'From the first hello to the final detail.'}).waitFor();
    assert(await root.evaluate(el=>el.scrollWidth<=el.clientWidth));
    await page.getByRole('button',{name:'Step inside',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-phase]')?.dataset.phase==='form',null,{timeout:15000});
    assert.equal(await root.getAttribute('data-audience'),'owner');
    await page.waitForFunction(()=>{const nav=document.querySelector('nav[aria-label="Booking story sections"]');return nav && !nav.closest('header').inert});
    if(viewport.width<600){
      const nav=await page.locator('header').filter({has:page.getByRole('navigation',{name:'Vanta products'})}).boundingBox();
      const tabs=await page.getByRole('navigation',{name:'Booking story sections'}).boundingBox();
      assert(tabs.y>=nav.y+nav.height, 'Mobile header must not overlap booking tabs');
    }
    await page.screenshot({path:`/tmp/vanta-owner-form-${viewport.width}.png`});
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.getByRole('button',{name:'See the studio',exact:true}).click();
    await page.getByRole('button',{name:'Explore features',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#studio-features')?.getAttribute('aria-hidden')==='false');
    const feature=page.getByRole('button',{name:'Explore Booking form & widget',exact:true});
    await feature.focus(); await feature.press('Enter');
    const detail=page.locator('dialog[open]'); await detail.waitFor();
    assert.equal(await detail.getByRole('link',{name:/Start free trial/}).getAttribute('href'),app+'/signup/');
    await page.keyboard.press('Escape');
    const pricing=page.getByRole('link',{name:'Pricing & terms'}); await pricing.focus(); await pricing.press('Enter');
    await page.getByRole('heading',{name:/One studio plan/}).waitFor();
    await page.getByRole('link',{name:'Contact',exact:true}).scrollIntoViewIfNeeded();
    assert(await page.getByRole('link',{name:'Contact',exact:true}).isVisible());
    await page.getByRole('heading',{name:/One studio plan/}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`/tmp/vanta-pricing-${viewport.width}.png`,fullPage:true});
    await page.getByRole('link',{name:'Start your 14-day free trial'}).click();
    await page.getByRole('heading',{name:'Start your free trial'}).waitFor();
    assert.equal(new URL(page.url()).origin,app);
    await page.getByRole('link',{name:'Back to studio',exact:true}).click();
    await page.getByRole('heading',{name:'From the first hello to the final detail.'}).waitFor();
    await page.getByRole('link',{name:'For artists',exact:true}).click();
    await page.getByRole('heading',{name:'Your art. Less admin.'}).waitFor();
    await page.getByRole('button',{name:'Watch the app tour',exact:true}).waitFor();
    assert.equal(await page.locator('canvas').count(),0);
    assert.equal(await page.locator('#artist-features dt').count(),11);
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.screenshot({path:`/tmp/vanta-artist-public-${viewport.width}-${reducedMotion}.png`,fullPage:true});
    await page.getByRole('link',{name:'For studios',exact:true}).click();
    await page.getByRole('heading',{name:'From the first hello to the final detail.'}).waitFor();
    await page.reload();
    await page.getByRole('heading',{name:'From the first hello to the final detail.'}).waitFor();
    await page.goto(app+'/');await page.getByRole('heading',{name:'Welcome back'}).waitFor();
    await page.goto(app+'/?signup');await page.getByRole('heading',{name:'Start your free trial'}).waitFor();
    await page.goto(app+'/features#pricing');await page.waitForURL(site+'/pricing', {timeout:10000}).catch(e=>{throw new Error(`Legacy pricing redirect ended at ${page.url()}: ${e.message}`)});await page.getByRole('heading',{name:/One studio plan/}).waitFor();
    await page.goto(site+'/studios/');await page.getByRole('heading',{name:'From the first hello to the final detail.'}).waitFor();
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    console.log(`PASS ${viewport.width} ${reducedMotion}: public navigation, direct owner/artist flows, demos, pricing, signup and legacy routes`);
    } catch (error) {
      console.error('FAILED AT', page.url(), viewport, reducedMotion, await page.locator('body').innerText());
      await page.screenshot({path:'/tmp/vanta-routing-failure.png'});
      throw error;
    } finally { await page.close(); }
   }
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
