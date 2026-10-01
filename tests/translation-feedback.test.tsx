// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QuizPanel } from '../src/QuizPanel';
afterEach(cleanup);
it('displays an explanation instead of a stored incomplete translation', async () => {
  const submit = vi.fn().mockResolvedValue({ correct: false, expected: 'make time', sentence: 'Try to make time.', translation: '___ 주세요.', input: 'wrong' });
  render(<QuizPanel question={{ id: 'x', sentence: 'Try to ___.' }} number={0} total={10} onAnswer={submit} onHint={async () => {}} onFinish={() => {}} />);
  fireEvent.change(screen.getByLabelText('영어 표현'), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));
  expect(await screen.findByText('이 문제의 해석을 준비하지 못했어요. 완성된 영어 예문과 정답을 확인해 주세요.')).toBeVisible();
  expect(screen.queryByText('___ 주세요.')).not.toBeInTheDocument();
  expect(screen.getByText('Try to make time.')).toBeVisible();
  expect(screen.getByText('make time')).toBeVisible();
});
