import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { MobileInput } from './MobileInput'

describe('MobileInput', () => {
  it('shows the fixed +63 prefix', async () => {
    const onChangeText = jest.fn()
    await render(<MobileInput value='' onChangeText={onChangeText} />)
    expect(screen.getByText('+63')).toBeOnTheScreen()
  })

  it('strips a leading zero, because users type 09xx out of habit', async () => {
    const onChangeText = jest.fn()
    await render(<MobileInput value='' onChangeText={onChangeText} />)
    fireEvent.changeText(screen.getByLabelText('Mobile number'), '09123456789')
    expect(onChangeText).toHaveBeenCalledWith('9123456789')
  })

  it('strips multiple leading zeros', async () => {
    const onChangeText = jest.fn()
    await render(<MobileInput value="" onChangeText={onChangeText} />)
    fireEvent.changeText(screen.getByLabelText('Mobile number'), '00009123456789')
    expect(onChangeText).toHaveBeenCalledWith('9123456789')
  })

  it('caps the national number length at 10 digits', async () => {
    const onChangeText = jest.fn()
    await render(<MobileInput value='' onChangeText={onChangeText} />)
    fireEvent.changeText(screen.getByLabelText('Mobile number'), '91234567890123456789')
    expect(onChangeText).toHaveBeenCalledWith('9123456789')
  })

  it('strips non-digit characters', async () => {
    const onChangeText = jest.fn()
    await render(<MobileInput value='' onChangeText={onChangeText} />)
    fireEvent.changeText(screen.getByLabelText('Mobile number'), '9123abc4567')
    expect(onChangeText).toHaveBeenCalledWith('91234567')
  })

  it('shows an error message', async () => {
    const onChangeText = jest.fn()
    await render(<MobileInput value='' onChangeText={onChangeText} error='Invalid mobile number' />)
    expect(screen.getByText('Invalid mobile number')).toBeOnTheScreen()
  })
})