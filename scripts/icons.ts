import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch();
try{
 for(const size of [192,512]){
  const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
  const svg=(await readFile('public/icon.svg','utf8')).replace('width="512" height="512"','width="'+size+'" height="'+size+'"');
  await page.setContent('<style>html,body{margin:0}svg{display:block}</style>'+svg);
  await page.locator('svg').screenshot({path:'public/icon-'+size+'.png'});
  await page.close();
 }
}finally{await browser.close();}
