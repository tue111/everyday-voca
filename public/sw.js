self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// No fetch interception: private content and API responses are never cached.
self.addEventListener('push',event=>{
 if(!event.data)return;
 let payload;try{payload=event.data.json();}catch{return;}
 event.waitUntil(self.registration.showNotification(payload.title||'틈 · 오늘의 영어',{body:payload.body,icon:'/icon-192.png',badge:'/icon-192.png',tag:payload.tag||'daily',data:{url:'/'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const window of windows){if(new URL(window.url).origin===self.location.origin){await window.navigate('/');return window.focus();}}return self.clients.openWindow('/');})());
});
