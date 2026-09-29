import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { BookOpen, Flower2, History, Menu, RefreshCw, Settings as SettingsIcon, X } from 'lucide-react';
import type { Command, View } from '../shared/contracts';
import { api, ApiError } from './api';
import { AppContext, useApp } from './state';
import { Brand, ErrorNote, RecoveryDialog } from './components';
import { Welcome } from './Auth';
import { Home } from './Home';
import { DailyQuiz, Learn, Result, ReviewPage } from './Study';
import { HistoryPage } from './History';
import { Settings } from './Settings';
import './styles.css';
function Layout(){
 const{view}=useApp();const[menu,setMenu]=useState(false);
 const links=[{to:'/',label:'오늘의 학습',icon:BookOpen},{to:'/review',label:'다시 기억하기',icon:RefreshCw},{to:'/history',label:'나의 발자국',icon:History},{to:'/settings',label:'설정',icon:SettingsIcon}];
 return <div className="app-shell"><aside className={'sidebar '+(menu?'open':'')}><Brand/><p className="sidebar-label">MY LEARNING SPACE</p><nav>{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setMenu(false)}><Icon size={19}/>{label}{to==='/review'&&!!view.review?.due&&<span className="nav-count">{view.review.due}</span>}</NavLink>)}</nav><div className="sidebar-bottom"><Flower2 size={32}/><p>서두르지 않아도 괜찮아요.<br/>오늘의 작은 한 걸음이면 충분해요.</p><div className="profile"><span className="avatar">{view.user?.name[0]}</span><span>{view.user?.name}<small>나만의 영어 습관</small></span></div></div></aside>{menu&&<button className="menu-scrim" aria-label="메뉴 닫기" onClick={()=>setMenu(false)}/>}<div className="workspace"><header className="topbar"><button aria-label={menu?'메뉴 접기':'메뉴 열기'} className="icon-button mobile-menu" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button><span>MY DAILY MOMENT</span><div className="topbar-right"><span className="date-label">{view.date.replaceAll('-','. ')}</span><span className="avatar light">{view.user?.name[0]}</span></div></header><main className="main-content"><Routes><Route path="/" element={<Home/>}/><Route path="/learn" element={<Learn/>}/><Route path="/quiz" element={<DailyQuiz key={view.date}/>}/><Route path="/result" element={<Result/>}/><Route path="/review" element={<ReviewPage key={view.date}/>}/><Route path="/history" element={<HistoryPage/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<Home/>}/></Routes><footer>틈 <span>조금씩, 꾸준히. 영어가 일상이 되는 시간.</span></footer></main></div></div>;
}
export default function App(){
 const[view,setView]=useState<View>(),[error,setError]=useState(''),[code,setCode]=useState('');const sequence=useRef(0);
 const refresh=async()=>{const request=++sequence.current;try{const result=await api();if(request===sequence.current){setView(result.view);setError('');}}catch(e){if(request!==sequence.current)return;if(e instanceof ApiError&&e.status===401)setView({date:new Date().toISOString().slice(0,10),user:null});else setError((e as Error).message);}};
 useEffect(()=>{void refresh();if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);
 const run=async(command:Command)=>{++sequence.current;try{const result=await api(command);setView(result.view);if(result.recoveryCode)setCode(result.recoveryCode);return result;}catch(e){if(e instanceof ApiError&&(e.status===401||e.status===409))await refresh();throw e;}};
 if(!view)return <main className="loading"><Flower2 size={34}/>{error?<><ErrorNote message={error}/><button className="button primary" onClick={()=>void refresh()}>다시 시도</button></>:<p>오늘의 작은 영어를 준비하고 있어요.</p>}</main>;
 return <AppContext.Provider value={{view,run,refresh}}><BrowserRouter>{view.user?<Layout key={view.user.id}/>:<Welcome/>}{code&&<RecoveryDialog code={code} onClose={()=>setCode('')}/>}</BrowserRouter></AppContext.Provider>;
}
