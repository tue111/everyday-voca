import {test,expect} from '@playwright/test';
test('F1-F8 signup, resume cards, quiz and recovery on another device',async({page,browser})=>{
 await page.goto('/');
 await page.getByLabel('어떻게 불러 드릴까요?').fill('지민');
 await page.getByRole('button',{name:'나의 첫 표현 만나기'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 const recovery=(await dialog.locator('code').textContent())!;
 await dialog.getByRole('button',{name:'보관했어요, 시작할게요'}).click();
 await expect(page.getByRole('heading',{name:'지민님, 오늘도 한 걸음.'})).toBeVisible();
 await expect(page.locator('.word-row')).toHaveCount(10);
 await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'오늘의 학습 시작'}).click();
 await page.getByRole('button',{name:'다음 표현'}).click();
 await page.reload();await expect(page.locator('.study-card>.eyebrow')).toContainText('02 / 10');
 for(let i=1;i<9;i++)await page.getByRole('button',{name:'다음 표현'}).click();
 await page.getByRole('button',{name:'퀴즈 시작'}).click();
 await page.getByRole('button',{name:'뜻 힌트 보기'}).click();await expect(page.locator('.hint')).toBeVisible();
 for(let i=0;i<10;i++){
  await page.getByLabel('영어 표현').fill('not the answer');
  await page.getByRole('button',{name:'정답 확인'}).click();
  await expect(page.getByText('한 번 더 익혀 두세요.')).toBeVisible();
  await page.getByRole('button',{name:i===9?'결과 보기':'다음 문제',exact:true}).click();
 }
 await expect(page.getByRole('heading',{name:'오늘의 학습을 마쳤어요!'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'오늘의 학습을 마쳤어요!'})).toBeVisible();
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const mobile=await context.newPage();await mobile.goto('/');
 await mobile.getByRole('button',{name:'이미 사용하고 있나요? 복구 코드로 이어가기'}).click();
 await mobile.getByLabel('복구 코드').fill(recovery);await mobile.getByRole('button',{name:'내 기록 이어가기'}).click();
 await expect(mobile.getByRole('button',{name:'오늘의 결과 보기'})).toBeVisible();
 await mobile.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await mobile.getByRole('button',{name:'메뉴 열기'}).click();await mobile.getByRole('link',{name:'설정',exact:true}).click();
 await mobile.getByLabel('이름',{exact:true}).fill('나래');await mobile.getByRole('button',{name:'저장',exact:true}).click();
 await expect(mobile.getByRole('status')).toContainText('이름을 변경했어요.');
 await context.close();
});
test('HTTP boundaries: CSRF, validation, cron authentication and private caching',async({request})=>{
 const r=await request.post('/api/app',{data:{action:'register',name:'csrf'}});
 expect(r.status()).toBe(403);
 const invalid=await request.post('/api/app',{headers:{Origin:'http://127.0.0.1:5180'},data:{action:'register',name:''}});
 expect(invalid.status()).toBe(400);
 expect((await request.get('/api/cron?job=morning')).status()).toBe(401);
 const read=await request.get('/api/app');expect(read.headers()['cache-control']).toBe('no-store');
});
test('welcome layout fits a narrow phone screen and empty recovery gives actionable feedback',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'이미 사용하고 있나요? 복구 코드로 이어가기'}).click();
 await page.getByLabel('복구 코드').fill('not-a-real-recovery-code-123');
 await page.getByRole('button',{name:'내 기록 이어가기'}).click();await expect(page.getByRole('alert')).toContainText('복구 코드를 확인');
});
