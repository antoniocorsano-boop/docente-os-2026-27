'use strict'

const { HVA_CANONICAL_NOW } = require('./hva-governed-baseline-config.cjs')

module.exports = { HVA_CANONICAL_NOW }

const fixedNow = process.env.HVA_FIXED_NOW?.trim()

if (fixedNow) {
  const fixedEpochMs = Date.parse(fixedNow)
  if (!Number.isFinite(fixedEpochMs)) {
    throw new Error('HVA_FIXED_NOW must be a valid date-time')
  }

  const RealDate = Date

  function FixedDate(...args) {
    if (!new.target) return new RealDate(fixedEpochMs).toString()
    if (args.length === 0) return new RealDate(fixedEpochMs)
    return new RealDate(...args)
  }

  Object.setPrototypeOf(FixedDate, RealDate)
  FixedDate.prototype = RealDate.prototype
  FixedDate.now = () => fixedEpochMs
  FixedDate.parse = RealDate.parse
  FixedDate.UTC = RealDate.UTC

  globalThis.Date = FixedDate
}
