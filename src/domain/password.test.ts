import { describe, expect, it } from 'vitest'
import { passwordStrength, validatePassword } from './password'

describe('validatePassword', () => {
  it('refuse un mot de passe trop court', () => {
    expect(validatePassword('abc123')).toMatch(/au moins 10 caractères/)
  })

  it('exige une lettre et un chiffre', () => {
    expect(validatePassword('abcdefghijkl')).toMatch(/lettre et un chiffre/)
    expect(validatePassword('1234567890123')).toMatch(/lettre et un chiffre/)
  })

  it('accepte un mot de passe correct', () => {
    expect(validatePassword('chat-et-souris-42')).toBeNull()
  })
})

describe('passwordStrength', () => {
  it('monte avec la longueur et la variété', () => {
    expect(passwordStrength('')).toBe(0)
    expect(passwordStrength('court1')).toBe(0)
    expect(passwordStrength('abcdefghi1')).toBe(1)
    expect(passwordStrength('Abcdefghijklmn1')).toBe(3)
    expect(passwordStrength('Abcdefghijklmn1!')).toBe(4)
  })
})
