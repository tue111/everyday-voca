import type { Bundle, Item } from '../shared/contracts.js';
const rows: [string, Item['kind'], string, string, string, string, string, string?][] = [
 ['make time','표현','시간을 내다','I make time for a walk every evening.','나는 매일 저녁 산책할 시간을 낸다.','Try to ___ for the people you care about.','소중한 사람들을 위해 시간을 내 보세요.'],
 ['errand','명사','심부름, 볼일','I have a quick errand to run.','나는 잠깐 볼일이 있다.','Picking up the package is my last ___ today.','택배를 찾는 것이 오늘의 마지막 볼일이다.'],
 ['look forward to','구동사','~을 기대하다','I look forward to our next trip.','나는 우리의 다음 여행이 기대된다.','We ___ seeing you this weekend.','우리는 이번 주말에 당신을 만나는 것을 기대한다.'],
 ['notice','동사','알아차리다','Did you notice the new painting?','새 그림을 알아차렸나요?','You might ___ a small difference in the taste.','맛에서 작은 차이를 알아차릴 수도 있다.'],
 ['cozy','형용사','아늑한','This café feels warm and cozy.','이 카페는 따뜻하고 아늑하다.','We stayed in a ___ little cabin.','우리는 아늑한 작은 오두막에 머물렀다.'],
 ['on the way','표현','가는 길에','I bought bread on the way home.','나는 집에 가는 길에 빵을 샀다.','Can you pick up some milk ___ back?','돌아오는 길에 우유 좀 사 올 수 있나요?'],
 ['figure out','구동사','알아내다, 이해하다','Let us figure out a better route.','더 나은 경로를 찾아보자.','I cannot ___ how this machine works.','나는 이 기계가 어떻게 작동하는지 모르겠다.'],
 ['habit','명사','습관','Reading before bed is a good habit.','잠자리에 들기 전 독서는 좋은 습관이다.','Checking my phone has become a daily ___.','휴대폰을 확인하는 것이 매일의 습관이 되었다.'],
 ['instead','부사','대신에','It was raining, so we stayed inside instead.','비가 와서 우리는 대신 실내에 머물렀다.','There is no coffee; would you like tea ___?','커피가 없는데 대신 차를 드시겠어요?'],
 ['take a break','표현','잠깐 쉬다','Let us take a break after lunch.','점심 식사 후에 잠깐 쉬자.','You should ___ before you get too tired.','너무 지치기 전에 잠깐 쉬는 것이 좋겠다.'],
 ['neighborhood','명사','동네, 인근','Our neighborhood has a small park.','우리 동네에는 작은 공원이 있다.','She knows everyone in the ___.','그녀는 동네 사람들을 모두 안다.'],
 ['pick up','구동사','찾아오다, 데리러 가다','I will pick up the tickets tomorrow.','나는 내일 표를 찾아올 것이다.','Could you ___ your sister from school?','학교에서 여동생을 데려올 수 있나요?'],
 ['available','형용사','시간이 되는, 이용 가능한','Are you available this afternoon?','오늘 오후에 시간 괜찮으세요?','There are no rooms ___ tonight.','오늘 밤에는 이용 가능한 방이 없다.'],
 ['bring along','구동사','가지고 오다, 데려오다','Please bring along a friend.','친구를 데리고 오세요.','Remember to ___ a warm jacket.','따뜻한 재킷을 가지고 오는 것을 기억하세요.'],
 ['share','동사','나누다, 공유하다','We share a desk at home.','우리는 집에서 책상을 함께 쓴다.','Would you like to ___ this dessert?','이 디저트를 나눠 먹을래요?'],
 ['appointment','명사','예약, 약속','My appointment is at three.','내 예약은 세 시이다.','You need an ___ to see the dentist.','치과 의사를 만나려면 예약이 필요하다.'],
 ['run out of','구동사','~이 다 떨어지다','We might run out of time.','우리는 시간이 부족해질 수도 있다.','Do not let the printer ___ paper.','프린터에 종이가 다 떨어지지 않게 하세요.'],
 ['simple','형용사','간단한','This recipe is very simple.','이 요리법은 매우 간단하다.','Sometimes a ___ answer is the best one.','때로는 간단한 답이 가장 좋다.'],
 ['remind','동사','상기시키다','Please remind me to call her.','그녀에게 전화하라고 알려 주세요.','Can you ___ him about our meeting?','그에게 우리 회의를 상기시켜 줄 수 있나요?'],
 ['at least','표현','적어도','Drink at least one glass of water.','물을 적어도 한 잔 마시세요.','The walk will take ___ twenty minutes.','걷는 데 적어도 이십 분이 걸릴 것이다.'],
 ['get along with','구동사','~와 잘 지내다','I get along with my neighbors.','나는 이웃들과 잘 지낸다.','Do you ___ your new coworkers?','새 직장 동료들과 잘 지내나요?'],
 ['choice','명사','선택','You made a good choice.','당신은 좋은 선택을 했다.','Staying home is also a ___.','집에 머무는 것도 하나의 선택이다.'],
 ['worth','형용사','~할 가치가 있는','The book is worth reading.','그 책은 읽을 가치가 있다.','This view is ___ the long walk.','이 경치는 오래 걸어올 가치가 있다.'],
 ['put off','구동사','미루다','Do not put off your homework.','숙제를 미루지 마세요.','We had to ___ the picnic because of rain.','우리는 비 때문에 소풍을 미뤄야 했다.'],
 ['grab','동사','재빨리 잡다, 간단히 먹다','Let us grab a coffee.','커피 한 잔 하자.','I will ___ my coat and meet you outside.','나는 코트를 챙겨서 밖에서 만날게.'],
 ['leftovers','명사','남은 음식','We had leftovers for lunch.','우리는 점심으로 남은 음식을 먹었다.','Put the ___ in the fridge.','남은 음식을 냉장고에 넣으세요.'],
 ['in a hurry','표현','서두르는','She left in a hurry.','그녀는 서둘러 떠났다.','I cannot chat now; I am ___.','지금 이야기할 수 없어요. 서두르고 있어요.'],
 ['bother','동사','귀찮게 하다','Sorry to bother you so late.','늦게 귀찮게 해서 미안해요.','Does the noise ___ you?','그 소음이 당신을 거슬리게 하나요?'],
 ['reliable','형용사','믿을 만한','He is a reliable friend.','그는 믿을 만한 친구이다.','We need a ___ way to get to work.','우리는 출근할 믿을 만한 방법이 필요하다.'],
 ['catch up','구동사','밀린 이야기를 나누다, 따라잡다','Let us catch up over lunch.','점심 먹으며 밀린 이야기를 나누자.','I need a weekend to ___ on my reading.','나는 밀린 독서를 따라잡을 주말이 필요하다.'],
];
export function fallbackBundle(date: string): Bundle {
 const bank = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000) % 3;
 return { topic: ['일상에 작은 여유를', '우리 동네의 하루', '가볍게 나누는 대화'][bank], items: rows.slice(bank * 10, bank * 10 + 10).map(([expression,kind,meaning,example,translation,question,questionTranslation,answer]) => ({ id: expression.replaceAll(' ', '-'), expression,kind,meaning,example,translation,question,questionTranslation,answers:[answer || expression] })) };
}
