import { test, expect } from '@playwright/test';
test('completed quiz mistakes can be retried, resumed and restarted without changing first score',async({page})=>{
 await page.setViewportSize({width:320,height:800});
 await page.goto('/');
 await page.getByLabel('어떻게 불러 드릴까요?').fill('재도전');
 await page.getByRole('button',{name:'나의 첫 표현 만나기'}).click();
 await page.getByRole('button',{name:'보관했어요, 시작할게요'}).click();
 await page.getByRole('button',{name:'오늘의 학습 시작'}).click();
 for(let i=0;i<9;i++)await page.getByRole('button',{name:'다음 표현'}).click();
 await page.getByRole('button',{name:'퀴즈 시작'}).click();
 const correct:string[]=[];
 for(let i=0;i<10;i++){
  await page.getByLabel('영어 표현').fill('wrong');
  await page.getByRole('button',{name:'정답 확인',exact:true}).click();
  correct.push((await page.locator('.feedback strong').textContent())!);
  await page.getByRole('button',{name:i===9?'결과 보기':'다음 문제',exact:true}).click();
 }
 await page.getByRole('button',{name:'오답 다시 풀기',exact:true}).click();
 await page.getByRole('button',{name:'오답 풀이 시작',exact:true}).click();
 for(let i=0;i<10;i++){
  if(i===1){await page.reload();await expect(page.locator('.quiz-card>.eyebrow')).toContainText('2 / 10');}
  if(i===0){
   await page.route('**/api/app',async route=>{if(route.request().method()==='POST')await route.abort();else await route.continue();});
   await page.getByLabel('영어 표현').fill(correct[i]);await page.getByRole('button',{name:'정답 확인',exact:true}).click();
   await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('영어 표현')).toHaveValue(correct[i]);
   await page.unroute('**/api/app');
  }
  await page.getByLabel('영어 표현').fill(correct[i]);
  await page.getByRole('button',{name:'정답 확인',exact:true}).click();
  await expect(page.getByText('잘 기억하고 있어요!',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:i===9?'결과 보기':'다음 문제',exact:true}).click();
 }
 await expect(page.getByText('10문제 중 10문제를 맞혔어요.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/retry-result.png',fullPage:true});
 await page.reload();await expect(page.getByText('10문제 중 10문제를 맞혔어요.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'오답 처음부터 다시 풀기'}).click();
 await expect(page.locator('.quiz-card>.eyebrow')).toContainText('1 / 10');
 await page.goto('/result');await expect(page.locator('.result-numbers>div').nth(1).locator('strong')).toHaveText('0');
});
