// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {QuizPanel} from '../src/QuizPanel';
afterEach(cleanup);
it('QUIZ-03 preserves input after a failed submission and allows retry',async()=>{
 const submit=vi.fn().mockRejectedValueOnce(new Error('저장 실패')).mockResolvedValue({correct:true,expected:'make time',sentence:'Try to make time.',translation:'시간을 내세요.',input:'make time'});
 render(<QuizPanel question={{id:'x',sentence:'Try to ___.'}} number={0} total={10} onAnswer={submit} onHint={async()=>{}} onFinish={()=>{}}/>);
 fireEvent.change(screen.getByLabelText('영어 표현'),{target:{value:'make time'}});
 fireEvent.click(screen.getByRole('button',{name:'정답 확인'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('저장 실패');
 expect(screen.getByLabelText('영어 표현')).toHaveValue('make time');
 fireEvent.click(screen.getByRole('button',{name:'정답 확인'}));
 expect(await screen.findByText('잘 기억하고 있어요!')).toBeVisible();
 expect(submit).toHaveBeenCalledTimes(2);
});
