// ── RAID efficiency ratios ────────────────────────────────────────────────────
export const RAID_EFFICIENCY = {
  'RAID 1':  0.50,
  'RAID 5':  0.75,
  'RAID 6':  0.66,
  'RAID 10': 0.50,
  'RAID 50': 0.75,
  'RAID 60': 0.66,
  'JBOD':    1.00,
}

export const RAID_OPTIONS = Object.keys(RAID_EFFICIENCY)

// Efficiency for a given RAID type (default RAID 6 = 0.66 if unknown)
export function raidEff(raidType) {
  return RAID_EFFICIENCY[raidType] ?? 0.66
}

// ── Disk tier display colors ──────────────────────────────────────────────────
const TIER_COLORS = {
  'Tier0 – NVMe':        '#7c3aed',
  'Tier1 – SSD':         '#2563eb',
  'Tier2 – HDD 10K/15K': '#d97706',
  'Tier3 – HDD 7.2K':    '#6b7280',
}

export function tierColor(tier) {
  return TIER_COLORS[tier] || '#94a3b8'
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

/**
 * Build { tierName: { raw_tb, usable_tb, device_count } } from a list of
 * storage device objects that have tier_capacities, raid_type and qty fields.
 */
export function buildTierSummary(storageDevices) {
  const map = {}
  ;(storageDevices || []).forEach(dev => {
    const qty = parseInt(dev.qty) || 1
    const eff = raidEff(dev.raid_type)
    ;(Array.isArray(dev.tier_capacities) ? dev.tier_capacities : []).forEach(({ tier, raw_tb }) => {
      const raw = (parseFloat(raw_tb) || 0) * qty
      if (!raw) return
      if (!map[tier]) map[tier] = { raw_tb: 0, usable_tb: 0, device_count: 0 }
      map[tier].raw_tb    += raw
      map[tier].usable_tb += raw * eff
      map[tier].device_count++
    })
  })
  Object.values(map).forEach(v => {
    v.raw_tb    = Math.round(v.raw_tb    * 10) / 10
    v.usable_tb = Math.round(v.usable_tb * 10) / 10
  })
  return map
}

/** Total raw capacity TB: sum(raw_capacity_tb × qty) across all storage devices */
export function totalRawTb(storageDevices) {
  return Math.round(
    (storageDevices || []).reduce(
      (s, d) => s + (parseFloat(d.raw_capacity_tb) || 0) * (parseInt(d.qty) || 1), 0
    ) * 10
  ) / 10
}

/** Total usable capacity TB: sum(usable_capacity_tb × qty) across all storage devices */
export function totalUsableTb(storageDevices) {
  return Math.round(
    (storageDevices || []).reduce(
      (s, d) => s + (parseFloat(d.usable_capacity_tb) || 0) * (parseInt(d.qty) || 1), 0
    ) * 10
  ) / 10
}
