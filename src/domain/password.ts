export const MIN_PASSWORD_LENGTH = 10

/** Message d'erreur si le mot de passe est trop faible, sinon `null`. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre.'
  }
  return null
}

/** Force de 0 à 4 : longueur, casse mélangée, chiffres et symboles. */
export function passwordStrength(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1
  if (password.length >= 14) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1
  return Math.min(4, score)
}
