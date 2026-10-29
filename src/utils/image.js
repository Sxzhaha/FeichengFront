import { isExternal } from '@/utils/validate'

const baseApi = import.meta.env.VITE_APP_BASE_API || ''
const apiProfilePrefixPattern = /^\/(?:dev-api|prod-api|stage-api)(\/profile\/)/i

export function isLocalImagePath(value) {
  const path = String(value || '').trim()
  return /^(blob:|file:)/i.test(path) || /^[a-zA-Z]:[\\/]/.test(path) || /^\\\\/.test(path)
}

export function normalizeImageUrl(value) {
  const rawPath = String(value || '').trim()
  if (!rawPath || isLocalImagePath(rawPath)) {
    return ''
  }

  let path = rawPath.replace(/\\/g, '/')
  if (baseApi && path.startsWith(baseApi)) {
    path = path.slice(baseApi.length)
  }
  path = path.replace(apiProfilePrefixPattern, '$1')

  if (isExternal(path)) {
    try {
      const url = new URL(path)
      const profilePath = url.pathname.replace(apiProfilePrefixPattern, '$1')
      if (profilePath.startsWith('/profile/')) {
        return `${profilePath}${url.search || ''}`
      }
    } catch (error) {
      return path
    }
    return path
  }

  if (path.startsWith('profile/')) {
    return `/${path}`
  }
  return path
}

export function parsePhotoUrls(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || '').split(',')
  return list
    .map(item => typeof item === 'string' ? item : (item?.url || item?.name || ''))
    .map(normalizeImageUrl)
    .filter(Boolean)
}

export function stringifyPhotoUrls(value) {
  return parsePhotoUrls(value).join(',')
}

export function getImageUrl(value) {
  const path = normalizeImageUrl(value)
  if (!path) {
    return ''
  }
  if (isExternal(path)) {
    return path
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseApi}${normalizedPath}`
}
