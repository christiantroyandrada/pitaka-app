import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { LoginForm } from './LoginForm'
import { SEED_USER } from '@/data/seed'

const fillValidCredentials = async () => {
  await fireEvent.changeText(screen.getByLabelText('Mobile number'), SEED_USER.mobile)
  await fireEvent.changeText(screen.getByLabelText(/MPIN/), SEED_USER.mpin)
}

describe('LoginForm', () => {
  it('calls onSuccess with correct credentials', async () => {
    const onSuccess = jest.fn()
    await render(<LoginForm onSuccess={onSuccess}/>)
    await fillValidCredentials()
    await fireEvent.press(screen.getByRole('button', {name: 'Login'}))
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid MPIN', async () => {
    const onSuccess = jest.fn()
    await render(<LoginForm onSuccess={onSuccess}/>)
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), SEED_USER.mobile)
    await fireEvent.changeText(screen.getByLabelText(/MPIN/), '666666')
    await fireEvent.press(screen.getByRole('button', {name: 'Login'}))
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByText('Incorrect mobile number or MPIN')).toBeOnTheScreen()
  })

  it('rejects unknown mobile number', async () => {
    const onSuccess = jest.fn()
    await render(<LoginForm onSuccess={onSuccess}/>)
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9990000000')
    await fireEvent.changeText(screen.getByLabelText(/MPIN/), SEED_USER.mpin)
    await fireEvent.press(screen.getByRole('button', {name: 'Login'}))
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByText('Incorrect mobile number or MPIN')).toBeOnTheScreen()
  })

  it('disables the login button until fields are complete', async () => {
    const onSuccess = jest.fn()
    await render(<LoginForm onSuccess={onSuccess}/>)
    expect(screen.getByRole('button', { name: 'Login' })).toBeDisabled()
    await fillValidCredentials()
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled()
  })

  it('clears the error once the user edits the MPIN again', async () => {
    const onSuccess = jest.fn()
    await render(<LoginForm onSuccess={onSuccess}/>)
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), SEED_USER.mobile)
    await fireEvent.changeText(screen.getByLabelText(/MPIN/), '666666')
    await fireEvent.press(screen.getByRole('button', {name: 'Login'})) 
    expect(screen.getByText('Incorrect mobile number or MPIN')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText(/MPIN/), '123456')
    expect(screen.queryByText('Incorrect mobile number or MPIN')).toBeNull()
  })
})