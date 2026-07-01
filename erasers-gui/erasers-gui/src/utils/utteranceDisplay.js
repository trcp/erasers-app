export function createUtterance(text, time = new Date(), source = 'manual') {
  const normalized = typeof text === 'string' ? text.trim() : ''
  if (!normalized) return null
  return {
    id: time.getTime() + Math.random(),
    text: normalized,
    time,
    source,
  }
}

export function shouldShowUtteranceOverlay(screen, textOnly) {
  return screen === 'speech' && !textOnly
}

export function getLatestUtteranceText(utterance) {
  return utterance?.text || ''
}

export function getTextOnlyUtteranceState(utterance, now = new Date(), expiresMs = 10000) {
  const text = getLatestUtteranceText(utterance)
  if (!text) {
    return {
      text: '',
      hasText: false,
      expired: false,
      ageLabel: '',
    }
  }

  const timeMs = utterance?.time instanceof Date
    ? utterance.time.getTime()
    : new Date(utterance?.time).getTime()
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const elapsedMs = Number.isFinite(timeMs) && Number.isFinite(nowMs)
    ? Math.max(0, nowMs - timeMs)
    : 0
  const expired = elapsedMs >= expiresMs

  return {
    text,
    hasText: true,
    expired,
    ageLabel: expired ? `Spoken ${formatElapsedTime(elapsedMs)} ago` : '',
  }
}

function formatElapsedTime(elapsedMs) {
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds} ${elapsedSeconds === 1 ? 'second' : 'seconds'}`
  }
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  return `${elapsedMinutes} ${elapsedMinutes === 1 ? 'minute' : 'minutes'}`
}

export function getUtteranceDisplayMode(textOnly, hasText = false) {
  if (!textOnly) {
    return {
      textOnly: false,
      hideTopBar: false,
      showHistory: true,
      showExitButton: false,
      rootClassName: 'speech-screen',
    }
  }

  return {
    textOnly: true,
    hasText: Boolean(hasText),
    hideTopBar: true,
    showHistory: false,
    showBackground: !hasText,
    showText: Boolean(hasText),
    showExitButton: true,
    rootClassName: hasText
      ? 'speech-screen speech-screen--text-only speech-screen--text-only-active'
      : 'speech-screen speech-screen--text-only',
  }
}
