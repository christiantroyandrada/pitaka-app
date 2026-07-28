import { harnessReady } from './smoke'

test('the test harness runs', () => {
  expect(harnessReady()).toBe(true)
})
