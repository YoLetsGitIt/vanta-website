// Static preview only: auth, billing, mailbox and settings requests are all mocked.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.VANTA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.VANTA_BOOKING_TEST_URL || 'http://127.0.0.1:3020';
const backend = 'https://inkspire-backend-xa2a.onrender.com';
const auth = { access_token: 'local-test-token', refresh_token: 'local-refresh-token', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: '11111111-1111-4111-8111-111111111111', email: 'artist@example.test', role: 'authenticated', aud: 'authenticated', user_metadata: {} } };
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.VANTA_CHROMIUM_PATH});
 try {
  for (const scenario of ['free-mobile','paid-desktop','non-artist','redemption-failure','settings-failure','cancelled-checkout']) {
   const context=await browser.newContext({viewport:scenario==='paid-desktop'?{width:1280,height:900}:{width:390,height:844}});
   const page=await context.newPage();let entitled=scenario==='paid-desktop', saves=0, redeemed=0, checkouts=0, cancelled=0, mailbox=0;
   let settings={send_confirmation_email:true,custom_email_provider:'vanta',custom_email_enabled:false,send_sms_reminder:false,send_reminder_7d:false,send_reminder_24h:false,notification_timezone:'Australia/Sydney',paid_features_available:entitled,connections:[],providers:{gmail:true,outlook:true},sms_available:true};
   await context.addInitScript(session=>localStorage.setItem('sb-aznxvdnpvbcofaqxgmtu-auth-token',JSON.stringify(session)),auth);
   await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.origin===new URL(base).origin)return route.continue();
    if(u.hostname.endsWith('supabase.co'))return route.fulfill({json:{user:auth.user}});
    if(u.origin===backend){
     assert.equal(req.headers().authorization,'Bearer local-test-token');
     if(u.pathname==='/users/me')return route.fulfill({json:{id:auth.user.id,accountType:scenario==='non-artist'?'user':'artist'}});
     if(u.pathname.endsWith('/notification-subscription'))return route.fulfill({json:{account:{status:entitled?'active':'none',paid_until:'2099-01-01T00:00:00Z'},entitled,has_subscription:scenario==='paid-desktop',checkout_available:true,price_amount:499,currency:'aud',pending_redemption:false}});
     if(u.pathname.endsWith('/client-notifications')){
      if(req.method()==='PUT'){saves++;if(scenario==='settings-failure')return route.fulfill({status:500,json:{error:'Unable to save settings'}});settings={...settings,...req.postDataJSON()};}
      return route.fulfill({json:{...settings,paid_features_available:entitled}});
     }
     if(u.pathname.endsWith('/redeem')){redeemed++;if(scenario==='redemption-failure')return route.fulfill({status:400,json:{error:'code is invalid, expired or already redeemed'}});assert.equal(req.postDataJSON().code,'VANTA-LOCAL');entitled=true;return route.fulfill({json:{months:1,access_until:'2099-02-01T00:00:00Z'}});}
     if(u.pathname.endsWith('/cancel-checkout')){cancelled++;return route.fulfill({json:{ok:true}});}
     if(u.pathname.endsWith('/checkout')){checkouts++;return route.fulfill({json:{url:'https://checkout.stripe.com/local-test'}});}
     if(u.pathname.includes('/notification-mailbox/')){mailbox++;return route.fulfill({json:{url:'https://accounts.google.com/local-test'}});}
     if(u.pathname.endsWith('/portal'))return route.fulfill({json:{url:'https://billing.stripe.com/local-test'}});
     throw new Error('Unexpected API '+u.pathname);
    }
    if(['checkout.stripe.com','billing.stripe.com','accounts.google.com'].includes(u.hostname))return route.fulfill({body:'Mock provider destination'});
    return route.abort();
   });
   await page.goto(base+'/artist/account'+(scenario==='cancelled-checkout'?'?checkout=cancelled':''));
   if(scenario==='non-artist') {await page.getByText('An artist account is needed').waitFor();assert.equal(checkouts,0);}
   else{
    await page.getByRole('heading',{name:'Delivery preferences'}).waitFor();
    if(scenario==='paid-desktop'){
     await page.getByLabel('7-day email reminder',{exact:true}).check();
     await page.getByRole('button',{name:'Save settings'}).click();
     await page.getByRole('status').filter({hasText:'Notification settings saved'}).waitFor();
     assert.equal(settings.send_reminder_7d,true);assert.equal(saves,1);
     await page.getByRole('button',{name:'Connect Gmail'}).click();await page.waitForURL('https://accounts.google.com/local-test');assert.equal(mailbox,1);
    }else if(scenario==='free-mobile'){
     assert.equal(await page.getByLabel('7-day email reminder',{exact:true}).isDisabled(),true);
     await page.getByLabel('Code',{exact:true}).fill('VANTA-LOCAL');await page.getByRole('button',{name:'Redeem code'}).click();
     await page.getByText('Paid features active',{exact:true}).waitFor();assert.equal(redeemed,1);
     assert.equal(await page.getByLabel('7-day email reminder',{exact:true}).isEnabled(),true);
     await page.screenshot({path:'/private/tmp/vanta-artist-account-mobile.png',fullPage:true});
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
     await page.getByRole('button',{name:'Subscribe for A$4.99/month'}).click();await page.waitForURL('https://checkout.stripe.com/local-test');assert.equal(checkouts,1);
    }else if(scenario==='redemption-failure'){
     await page.getByLabel('Code',{exact:true}).fill('invalid');await page.getByRole('button',{name:'Redeem code'}).click();await page.getByRole('alert').filter({hasText:'code is invalid'}).waitFor();assert.equal(await page.getByLabel('7-day email reminder',{exact:true}).isDisabled(),true);
    }else if(scenario==='settings-failure'){
     await page.getByLabel('Confirmation email · Free').uncheck();await page.getByRole('button',{name:'Save settings'}).click();await page.getByRole('alert').filter({hasText:'Unable to save settings'}).waitFor();assert.equal(settings.send_confirmation_email,true);
    }else if(scenario==='cancelled-checkout'){assert.equal(cancelled,1);assert.equal(new URL(page.url()).search,'');}
   }
   await context.close();console.log('PASS '+scenario);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
