import {test,expect} from '@playwright/test';
import {setup,register,complete} from '../helpers';
import {commandSchema} from '../../shared/contracts';
test('F9-F10 review resumes after reload and remains independent of today completion',async({page})=>{
 const{service,clock,store}=setup(),a=await register(service);
 await complete(service,a.token,false);clock.set('2026-09-25T03:00:00Z');
 await page.route('**/api/app',async route=>{
  const r=route.request();
  try{
   const reply=r.method()==='GET'?{view:await service.view(a.token)}:(await service.execute(a.token,commandSchema.parse(r.postDataJSON()))).reply;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(reply)});
  }catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{message:(e as Error).message}})});}
 });
 await page.goto('/review');await expect(page.getByRole('button',{name:'복습 시작',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'복습 시작',exact:true}).click();
 const first=Object.values((await store.read()).users[a.id].reviews)[0];
 await page.getByLabel('영어 표현').fill(first.item.answers[0]);await page.getByRole('button',{name:'정답 확인'}).click();
 await expect(page.getByText('잘 기억하고 있어요!')).toBeVisible();
 await page.getByRole('button',{name:'다음 문제',exact:true}).click();await page.reload();
 await expect(page.locator('.study-card>.eyebrow')).toContainText('2 / 10');
 for(let i=1;i<10;i++){await page.getByLabel('영어 표현').fill('wrong');await page.getByRole('button',{name:'정답 확인'}).click();await page.getByRole('button',{name:i===9?'결과 보기':'다음 문제',exact:true}).click();}
 await expect(page.getByRole('heading',{name:'기억이 조금 더 단단해졌어요.'})).toBeVisible();
 expect((await service.view(a.token)).progress!.completedAt).toBeUndefined();
 await page.screenshot({path:'test-results/review-result.png',fullPage:true});
});
