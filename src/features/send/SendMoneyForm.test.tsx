import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { SendMoneyForm } from './SendMoneyForm'
import { createWalletStore } from '../../data/walletStore'
import { ACCOUNTS } from '../../data/seed'

const fill = async (mobile: string, amount: string) => {
  await fireEvent.changeText(screen.getByLabelText('Mobile number'), mobile)
  await fireEvent.changeText(screen.getByLabelText('Amount'), amount)
}

describe('SendMoneyForm', () => {
  it('moves money and calls onDone', async () => {
    const store = createWalletStore()
    const onDone = jest.fn()
    await render(<SendMoneyForm store={store} onDone={onDone} />)
    await fill('9998887777', '50')
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }))
    expect(store.getBalance(ACCOUNTS.user)).toBe(640613)
    expect(onDone).toHaveBeenCalled()
  })

  it('shows an error and moves nothing when funds are insufficient', async () => {
    const store = createWalletStore()
    await render(<SendMoneyForm store={store} onDone={jest.fn()} />)
    await fill('9998887777', '999999')
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText('Not enough balance')).toBeOnTheScreen()
    expect(store.getBalance(ACCOUNTS.user)).toBe(645613)
  })

  it('rejects an unparseable amount', async () => {
    const store = createWalletStore()
    await render(<SendMoneyForm store={store} onDone={jest.fn()} />)
    await fill('9998887777', '1.234')
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText('Enter a valid amount')).toBeOnTheScreen()
    expect(store.getBalance(ACCOUNTS.user)).toBe(645613)
  })

  it('disables Send until both fields are filled', async () => {
    await render(<SendMoneyForm store={createWalletStore()} onDone={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    await fill('9998887777', '50')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('double-pressing Send does not send twice', async () => {
    const store = createWalletStore()
    await render(<SendMoneyForm store={store} onDone={jest.fn()} />)
    await fill('9998887777', '50')
    const button = screen.getByRole('button', { name: 'Send' })
    await fireEvent.press(button)
    await fireEvent.press(button)
    expect(store.getBalance(ACCOUNTS.user)).toBe(640613)
  })

  // The balance alone cannot catch this: the ledger would replay a second
  // press harmlessly, but the screen would still be popped twice.
  it('double-pressing Send completes the flow only once', async () => {
    const store = createWalletStore()
    const onDone = jest.fn()
    await render(<SendMoneyForm store={store} onDone={onDone} />)
    await fill('9998887777', '50')
    const button = screen.getByRole('button', { name: 'Send' })
    await fireEvent.press(button)
    await fireEvent.press(button)
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})