import { test, expect } from '@playwright/test';
test('SPEECH: authenticated audio, cached replay, mobile layout and explicit error fallback', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    const original=URL.createObjectURL.bind(URL);
    URL.createObjectURL=(blob:Blob|MediaSource)=>{
      if(blob instanceof Blob)(window as Window & {speechBytes?:number}).speechBytes=blob.size;
      return original(blob);
    };
  });
  await page.goto('/');
  await page.getByLabel('어떻게 불러 드릴까요?').fill('음성테스트');
  await page.getByRole('button',{name:'나의 첫 표현 만나기'}).click();
  await page.getByRole('button',{name:'보관했어요, 시작할게요'}).click();
  await page.getByRole('button',{name:'오늘의 학습 시작'}).click();
  await expect(page.getByText('미국식 영어 · AI 생성 음성')).toBeVisible();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/speech')&&r.status()===200);
  await page.getByRole('button',{name:'표현 듣기',exact:true}).click();
  const audio=await response; expect(audio.headers()['content-type']).toBe('audio/wav');
  // Chromium's DevTools response-body retrieval can omit media bytes. Verify the
  // Blob actually delivered to the player, not that debugging representation.
  await expect.poll(()=>page.evaluate(()=>(window as Window & {speechBytes?:number}).speechBytes??0)).toBeGreaterThan(44);
  await expect(page.getByRole('button',{name:'표현 듣기',exact:true})).toBeEnabled();
  await page.getByLabel('음성 재생 속도').selectOption('0.85');
  await page.getByRole('button',{name:'표현 듣기',exact:true}).click();
  await expect(page.getByRole('button',{name:'표현 듣기',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.route('**/api/speech',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'음성 생성에 실패했어요.'}})}));
  await page.getByRole('button',{name:'예문 듣기',exact:true}).click();
  await expect(page.getByText('음성 생성에 실패했어요.')).toBeVisible();
  await expect(page.getByRole('button',{name:'기기 음성으로 듣기'})).toBeVisible();
  await page.screenshot({path:'test-results/speech-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'다음 표현'}).click();
  await expect(page.getByText('음성 생성에 실패했어요.')).toHaveCount(0);
  await expect(page.locator('.study-card>.eyebrow')).toContainText('02 / 10');
});
test('SPEECH HTTP rejects anonymous, cross-origin and arbitrary text requests',async({request})=>{
  const data={date:'2026-09-24',itemId:'x',target:'expression'};
  expect((await request.post('/api/speech',{data})).status()).toBe(403);
  const headers={Origin:'http://127.0.0.1:5180'};
  expect((await request.post('/api/speech',{headers,data})).status()).toBe(401);
  expect((await request.post('/api/speech',{headers,data:{...data,text:'read anything'}})).status()).toBe(400);
});
