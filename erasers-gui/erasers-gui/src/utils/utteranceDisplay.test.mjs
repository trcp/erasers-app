import assert from 'node:assert/strict'
import {
  createUtterance,
  getLatestUtteranceText,
  getTextOnlyUtteranceState,
  getUtteranceDisplayMode,
  shouldShowUtteranceOverlay,
} from './utteranceDisplay.js'

assert.deepEqual(getUtteranceDisplayMode(false), {
  textOnly: false,
  hideTopBar: false,
  showHistory: true,
  showExitButton: false,
  rootClassName: 'speech-screen',
})

assert.deepEqual(getUtteranceDisplayMode(true), {
  textOnly: true,
  hasText: false,
  hideTopBar: true,
  showHistory: false,
  showBackground: true,
  showText: false,
  showExitButton: true,
  rootClassName: 'speech-screen speech-screen--text-only',
})

assert.deepEqual(getUtteranceDisplayMode(true, true), {
  textOnly: true,
  hasText: true,
  hideTopBar: true,
  showHistory: false,
  showBackground: false,
  showText: true,
  showExitButton: true,
  rootClassName: 'speech-screen speech-screen--text-only speech-screen--text-only-active',
})

assert.equal(getLatestUtteranceText({ text: 'Hello' }), 'Hello')
assert.equal(getLatestUtteranceText(null), '')

const now = new Date('2026-07-01T12:00:00.000Z')

assert.deepEqual(
  getTextOnlyUtteranceState({ text: 'Hello', time: new Date('2026-07-01T11:59:55.000Z') }, now),
  {
    text: 'Hello',
    hasText: true,
    expired: false,
    ageLabel: '',
  }
)

assert.deepEqual(
  getTextOnlyUtteranceState({ text: 'Hello', time: new Date('2026-07-01T11:59:45.000Z') }, now),
  {
    text: 'Hello',
    hasText: true,
    expired: true,
    ageLabel: 'Spoken 15 seconds ago',
  }
)

assert.deepEqual(
  getTextOnlyUtteranceState({ text: 'Hello', time: new Date('2026-07-01T11:57:00.000Z') }, now),
  {
    text: 'Hello',
    hasText: true,
    expired: true,
    ageLabel: 'Spoken 3 minutes ago',
  }
)

assert.deepEqual(getTextOnlyUtteranceState(null, now), {
  text: '',
  hasText: false,
  expired: false,
  ageLabel: '',
})

const simulated = createUtterance('  Console speech  ', now)
assert.equal(simulated.text, 'Console speech')
assert.equal(simulated.source, 'manual')
assert.equal(simulated.time, now)
assert.equal(createUtterance('   ', now), null)

assert.equal(shouldShowUtteranceOverlay('speech', false), true)
assert.equal(shouldShowUtteranceOverlay('speech', true), false)
assert.equal(shouldShowUtteranceOverlay('remote', false), false)
