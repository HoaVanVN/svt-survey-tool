// ── RAID / Data Protection efficiency ratios ──────────────────────────────────
// Usable = Raw × efficiency
export const RAID_EFFICIENCY = {
  // ── Traditional RAID ─────────────────────────────────────────────────────
  'RAID 1':  0.50,   // 2-way mirror
  'RAID 5':  0.75,   // (n-1)/n drives usable, typically 4+1
  'RAID 6':  0.66,   // (n-2)/n drives usable, typically 4+2 ≈ 66%
  'RAID 10': 0.50,   // 2-way mirror + stripe
  'RAID 50': 0.75,   // RAID 5 + 0
  'RAID 60': 0.66,   // RAID 6 + 0
  'JBOD':    1.00,   // no parity

  // ── Distributed RAID (IBM FlashSystem / Storwize) ─────────────────────────
  'DRAID 5': 0.75,   // Distributed RAID 5 + distributed hot spare
  'DRAID 6': 0.66,   // Distributed RAID 6 + distributed hot spare

  // ── IBM ADAPT RAID (dynamic RAID with variable drives) ────────────────────
  'ADAPT RAID 5': 0.75,  // Adaptive RAID, RAID-5 tier efficiency
  'ADAPT RAID 6': 0.66,  // Adaptive RAID, RAID-6 tier efficiency

  // ── HPE / NetApp ─────────────────────────────────────────────────────────
  'Double Parity (DP)': 0.66,   // HPE MSA / 3PAR equivalent to RAID 6
  'RAID-DP':  0.66,              // NetApp double parity

  // ── VMware vSAN / HCI ────────────────────────────────────────────────────
  'vSAN FTT1 (RAID 1)': 0.50,   // 2 copies, 1 failure tolerated
  'vSAN FTT1 (RAID 5)': 0.75,   // EC in 4-node config
  'vSAN FTT2 (RAID 6)': 0.67,   // EC in 6-node config
  'vSAN FTT3 (RAID 1)': 0.33,   // 3 copies, 3 failures tolerated

  // ── Erasure Coding ───────────────────────────────────────────────────────
  'EC 4+2':  0.67,   // 4 data + 2 parity = 66.7% usable
  'EC 8+2':  0.80,   // 8 data + 2 parity = 80.0% usable
  'EC 16+2': 0.89,   // 16 data + 2 parity = 88.9% usable

  // ── Ceph / Red Hat ODF ───────────────────────────────────────────────────
  'Ceph Replication 3x':  0.33,  // 3-way replication
  'Ceph Replication 2x':  0.50,  // 2-way replication
  'Ceph EC 2+1':          0.67,  // 2 data + 1 parity
  'Ceph EC 4+2':          0.67,  // 4 data + 2 parity
  'Ceph EC 8+3':          0.73,  // 8 data + 3 parity
}

export const RAID_OPTIONS = Object.keys(RAID_EFFICIENCY)

/** Efficiency for a given RAID type; defaults to RAID 6 (0.66) if unknown */
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
 * storage device objects (each with tier_capacities: [{ tier, raw_tb, usable_tb }], qty).
 * usable_tb is taken directly from each tier entry (user-entered, not RAID-computed).
 */
export function buildTierSummary(storageDevices) {
  const map = {}
  ;(storageDevices || []).forEach(dev => {
    const qty = parseInt(dev.qty) || 1
    ;(Array.isArray(dev.tier_capacities) ? dev.tier_capacities : []).forEach(({ tier, raw_tb, usable_tb }) => {
      const raw    = (parseFloat(raw_tb)    || 0) * qty
      const usable = (parseFloat(usable_tb) || 0) * qty
      if (!raw && !usable) return
      if (!map[tier]) map[tier] = { raw_tb: 0, usable_tb: 0, device_count: 0 }
      map[tier].raw_tb    += raw
      map[tier].usable_tb += usable
      map[tier].device_count++
    })
  })
  Object.values(map).forEach(v => {
    v.raw_tb    = Math.round(v.raw_tb    * 10) / 10
    v.usable_tb = Math.round(v.usable_tb * 10) / 10
  })
  return map
}

/** Total raw capacity TB: sum of all tier raw_tb × qty across all storage devices */
export function totalRawTb(storageDevices) {
  return Math.round(
    (storageDevices || []).reduce((s, d) => {
      const qty = parseInt(d.qty) || 1
      const raw = (Array.isArray(d.tier_capacities) ? d.tier_capacities : [])
        .reduce((ts, t) => ts + (parseFloat(t.raw_tb) || 0), 0)
      return s + raw * qty
    }, 0) * 10
  ) / 10
}

/** Total usable capacity TB: sum of all tier usable_tb × qty across all storage devices */
export function totalUsableTb(storageDevices) {
  return Math.round(
    (storageDevices || []).reduce((s, d) => {
      const qty    = parseInt(d.qty) || 1
      const usable = (Array.isArray(d.tier_capacities) ? d.tier_capacities : [])
        .reduce((ts, t) => ts + (parseFloat(t.usable_tb) || 0), 0)
      return s + usable * qty
    }, 0) * 10
  ) / 10
}
