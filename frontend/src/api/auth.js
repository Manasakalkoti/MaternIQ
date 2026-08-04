function tokenKey(role) {
  return `materniq_${role}_token`
}

function idKey(role) {
  return `materniq_${role}_id`
}

export function saveAuth(role, { token, id }) {
  localStorage.setItem(tokenKey(role), token)
  localStorage.setItem(idKey(role), id)
}

export function getToken(role) {
  return localStorage.getItem(tokenKey(role))
}

export function clearAuth(role) {
  localStorage.removeItem(tokenKey(role))
  localStorage.removeItem(idKey(role))
}
