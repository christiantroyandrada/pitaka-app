import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { MpinInput } from './MpinInput'

describe('MpinInput', () => {
  it('reports typed digits to the parent', async () => {
    const onChangeText = jest.fn()
    await render(<MpinInput value='' onChangeText={onChangeText} />)
    fireEvent.changeText(screen.getByLabelText(/MPIN/), '123')
    expect(onChangeText).toHaveBeenCalledWith('123')
  })

  it('enforces the digit limit in the handler', async () => {
    const onChangeText = jest.fn()
    await render(<MpinInput value='' onChangeText={onChangeText} digits={6} />)
    fireEvent.changeText(screen.getByLabelText(/MPIN/), '1234567')
    expect(onChangeText).toHaveBeenCalledWith('123456')
  })

  it('strips non-digit characters', async () => {
    const onChangeText = jest.fn()
    await render(<MpinInput value='' onChangeText={onChangeText} />)
    fireEvent.changeText(screen.getByLabelText(/MPIN/), '1a2b3')
    expect(onChangeText).toHaveBeenCalledWith('123')
  })

  it('announces entry progress because the dots are decorative', async () => {
    const onChangeText = jest.fn()
    await render(<MpinInput value='12' onChangeText={onChangeText} digits={6} />)
    expect(screen.getByLabelText('MPIN, 2 of 6 digits entered')).toBeOnTheScreen()
  })

  it('shows an error message', async () => {
    const onChangeText = jest.fn()
    await render(<MpinInput value='' onChangeText={onChangeText} error='Invalid MPIN' />)
    expect(screen.getByText('Invalid MPIN')).toBeOnTheScreen()
  })
})