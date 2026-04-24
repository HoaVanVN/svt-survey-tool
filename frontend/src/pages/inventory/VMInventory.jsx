import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as inventoryApi, rvtools as rvtoolsApi } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import { useAutoSave } from '../../hooks/useAutoSave'
import InventoryTable from '../../components/InventoryTable'

const FIELDS = [
  { key: 'name',        label: 'Tên VM',      type: 'text',   width: 140,
    pasteAlts: ['vm', 'vm name', 'virtual machine', 'name'] },
  { key: 'guest_os',    label: 'Guest OS',    type: 'text',   width: 200,
    pasteAlts: ['guest os', 'os according to vmware tools', 'os according to configuration file', 'vmware tools os'] },
  { key: 'os_type',     label: 'OS',          type: 'text',   width: 130,
    pasteAlts: ['os', 'os type', 'os version', 'operating system', 'platform'] },
  { key: 'vcpu',        label: 'vCPU',        type: 'number', width: 55,
    pasteAlts: ['vcpu', 'cpus', 'cpu', 'cores'] },
  { key: 'ram_gb',      label: 'RAM (GB)',     type: 'number', width: 70,
    pasteAlts: ['ram', 'memory', 'ram gb', 'memory gb'] },
  { key: 'disk_gb',     label: 'Disk (GB)',    type: 'number', width: 70,
    pasteAlts: ['disk', 'disk gb', 'storage gb', 'total disk', 'provisioned'] },
  { key: 'cluster',     label: 'Cluster',     type: 'text',   width: 110,
    pasteAlts: ['cluster'] },
  { key: 'host_server', label: 'Host',        type: 'text',   width: 130,
    pasteAlts: ['host', 'host server', 'esxi host', 'hypervisor host'] },
  { key: 'datastore',   label: 'Datastore',   type: 'text',   width: 110,
    pasteAlts: ['datastore', 'storage'] },
  { key: 'hypervisor',  label: 'Hypervisor',  type: 'text',   width: 160,
    pasteAlts: ['hypervisor', 'esx version', 'esxi version', 'platform version'] },
  { key: 'environment', label: 'Môi trường',  type: 'select', refType: 'environments', width: 100 },
  { key: 'power_state', label: 'Power',       type: 'select', width: 80,
    options: ['On', 'Off', 'Suspended'], pasteAlts: ['power', 'power state', 'powerstate'] },
  { key: 'status',      label: 'Trạng thái',  type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes',       label: 'Ghi chú',     type: 'text',   width: 110,
    pasteAlts: ['notes', 'note', 'annotation', 'comment', 'ghi chú'] },
]

// ── OS normalisation ──────────────────────────────────────────────────────────
// Converts a full RVTools OS string to a short, human-readable name.
export function normalizeOS(raw) {
  const s = (raw || '').toLowerCase()
  if (!s || s === 'other' || s === 'other (32-bit)' || s === 'other (64-bit)') return 'Other / Unknown'
  // Windows Server
  for (const yr of ['2025', '2022', '2019', '2016', '2012 r2', '2012', '2008 r2', '2008', '2003']) {
    if (s.includes(`windows server ${yr}`)) return `Windows Server ${yr}`
  }
  if (s.includes('windows server')) return 'Windows Server'
  // Windows Desktop
  if (s.includes('windows 11')) return 'Windows 11'
  if (s.includes('windows 10')) return 'Windows 10'
  if (s.includes('windows 7')) return 'Windows 7'
  if (s.includes('windows')) return 'Windows'
  // RHEL / Red Hat
  const rhelMatch = s.match(/red hat.*?(\d+)/) || s.match(/rhel.*?(\d+)/)
  if (rhelMatch) return `RHEL ${rhelMatch[1]}`
  if (s.includes('red hat') || s.includes('rhel')) return 'RHEL'
  // Ubuntu
  const ubuntuMatch = raw && raw.match(/ubuntu.*?(\d{2}\.\d{2})/i)
  if (ubuntuMatch) return `Ubuntu ${ubuntuMatch[1]}`
  if (s.includes('ubuntu')) return 'Ubuntu'
  // CentOS
  const centosMatch = s.match(/centos.*?(\d+)/)
  if (centosMatch) return `CentOS ${centosMatch[1]}`
  if (s.includes('centos')) return 'CentOS'
  // Debian
  const debMatch = s.match(/debian.*?(\d+)/)
  if (debMatch) return `Debian ${debMatch[1]}`
  if (s.includes('debian')) return 'Debian'
  // SUSE
  if (s.includes('suse') || s.includes('sles')) return 'SUSE / SLES'
  // Oracle Linux
  if (s.includes('oracle linux')) return 'Oracle Linux'
  // Rocky / AlmaLinux
  if (s.includes('rocky')) return 'Rocky Linux'
  if (s.includes('alma')) return 'AlmaLinux'
  // FreeBSD / Solaris / VMware
  if (s.includes('freebsd')) return 'FreeBSD'
  if (s.includes('solaris')) return 'Solaris'
  if (s.includes('photon')) return 'VMware Photon'
  // Return cleaned raw string as-is when no pattern matches
  return (raw || '').replace(/\s*\(64-bit\)\s*/i, '').replace(/\s*\(32-bit\)\s*/i, ' (32-bit)').trim() || 'Unknown'
}

function mapPowerState(ps) {
  const s = (ps || '').toLowerCase()
  if (s === 'poweredon')  return 'On'
  if (s === 'poweredoff') return 'Off'
  if (s === 'suspended')  return 'Suspended'
  return ps || ''
}

// Extract datastore name from RVTools Path field: "[datastore_name] vm/vm.vmx"
function extractDatastore(path) {
  const m = (path || '').match(/^\[([^\]]+)\]/)
  return m ? m[1] : ''
}

// Dynamic OS lookup — tolerates SheetJS column name variations (with/without "the", etc.)
function getGuestOS(row) {
  const exact = [
    'OS according to the VMware Tools',
    'OS according to the configuration file',
    'OS according to VMware Tools',
    'OS according to configuration file',
  ]
  for (const k of exact) {
    if (row[k] && String(row[k]).trim() !== '') return String(row[k]).trim()
  }
  const allKeys = Object.keys(row)
  const toolsKey = allKeys.find(k => k.toLowerCase().includes('os according') && k.toLowerCase().includes('tool'))
  if (toolsKey && row[toolsKey]) return String(row[toolsKey]).trim()
  const cfgKey = allKeys.find(k => k.toLowerCase().includes('os according'))
  if (cfgKey && row[cfgKey]) return String(row[cfgKey]).trim()
  return ''
}

// Strip build number: "VMware ESXi 8.0.3 build-24859861" → "VMware ESXi 8.0.3"
function cleanEsxVersion(v) {
  return (v || '').replace(/\s+build-\S+/i, '').trim()
}

function mapVInfoToVMs(vinfo, hostVersionMap) {
  return vinfo.map((row, i) => {
    const guestOS = getGuestOS(row)
    return {
      id: Date.now() + i,
      name:         row['VM'] || row['Name'] || '',
      guest_os:     guestOS,
      os_type:      normalizeOS(guestOS),
      vcpu:         Number(row['CPUs'] || row['CPU'] || 0),
      ram_gb:       Math.round(Number(row['Memory'] || 0) / 1024),
      disk_gb:      Math.round(Number(row['Total disk capacity MiB'] || row['Provisioned MiB'] || 0) / 1024),
      cluster:      row['Cluster'] || '',
      host_server:  row['Host'] || '',
      datastore:    extractDatastore(row['Path']) || '',
      hypervisor:   cleanEsxVersion(hostVersionMap?.[row['Host']]) || 'VMware vSphere',
      environment:  '',
      power_state:  mapPowerState(row['Powerstate'] || ''),
      status:       'Using',
      notes:        row['Annotation'] || '',
    }
  })
}

// ── Merge helpers ─────────────────────────────────────────────────────────────

/** Deduplicate array by a string key (last-in wins). */
function dedupBy(arr1, arr2, key) {
  const map = {}
  ;[...arr1, ...arr2].forEach(r => { if (r[key]) map[r[key]] = r })
  return Object.values(map)
}

/** Parse one RVTools Excel file; returns { vinfo, vhost, vcluster, vdatastore, vsnapshot, vhealth, vlicense, vdisk } */
async function parseRVToolsFile(file) {
  // SheetJS 0.20.2 loaded from CDN (index.html) – not from npm (avoids CVE-2023-30533 in xlsx@0.18.5).
  // SheetJS is the only library that reliably handles all RVTools Excel variants (shared strings,
  // rich text cells, legacy encoding, formula cells, etc.).
  const XLSX = window.XLSX
  if (!XLSX) throw new Error('SheetJS chưa tải – kiểm tra kết nối internet và thử lại.')

  const buf = await file.arrayBuffer()
  const wb  = XLSX.read(new Uint8Array(buf), { type: 'array' })

  const getSheet = (name) => {
    const sn = wb.SheetNames.find(n => n.toLowerCase() === name.toLowerCase())
    return sn ? XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' }) : []
  }

  return {
    vinfo:      getSheet('vInfo'),
    vhost:      getSheet('vHost'),
    vcluster:   getSheet('vCluster'),
    vdatastore: getSheet('vDatastore'),
    vsnapshot:  getSheet('vSnapshot'),
    vhealth:    getSheet('vHealth'),
    vlicense:   getSheet('vLicense'),
    vdisk:      getSheet('vDisk'),
  }
}

/** Merge new RVTools data into existing accumulated data. */
function mergeRVTools(existing, incoming) {
  return {
    vinfo:      [...(existing.vinfo      || []), ...incoming.vinfo],
    vhost:      dedupBy(existing.vhost      || [], incoming.vhost,      'Host'),
    vcluster:   dedupBy(existing.vcluster   || [], incoming.vcluster,   'Cluster'),
    vdatastore: dedupBy(existing.vdatastore || [], incoming.vdatastore, 'Name'),
    vsnapshot:  [...(existing.vsnapshot  || []), ...incoming.vsnapshot],
    vhealth:    [...(existing.vhealth    || []), ...incoming.vhealth],
    vlicense:   [...(existing.vlicense   || []), ...incoming.vlicense],
    vdisk:      [...(existing.vdisk      || []), ...incoming.vdisk],
  }
}

function buildSummary(merged) {
  const { vinfo, vhost, vcluster, vdatastore, vsnapshot, vhealth } = merged
  const poweredOn    = vinfo.filter(r => (r['Powerstate'] || '').toLowerCase() === 'poweredon').length
  const totalVcpu    = vinfo.reduce((s, r) => s + Number(r['CPUs'] || 0), 0)
  const totalRamMiB  = vinfo.reduce((s, r) => s + Number(r['Memory'] || 0), 0)
  const totalDiskMiB = vinfo.reduce((s, r) => s + Number(r['Total disk capacity MiB'] || 0), 0)
  return {
    total_vms:            vinfo.length,
    powered_on:           poweredOn,
    powered_off:          vinfo.length - poweredOn,
    total_vcpu:           totalVcpu,
    total_ram_gib:        Math.round(totalRamMiB / 1024),
    total_disk_tb:        Math.round(totalDiskMiB / 1024 / 1024 * 10) / 10,
    host_count:           vhost.length,
    cluster_count:        vcluster.length,
    datastore_count:      vdatastore.length,
    snapshot_count:       vsnapshot.length,
    health_warning_count: vhealth.length,
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VMInventory() {
  const { id } = useParams()
  const refs = useRefs()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [rvtoolsInfo, setRvtoolsInfo] = useState(null)  // full raw rvtools record
  const replaceRef = useRef(null)
  const mergeRef   = useRef(null)

  useEffect(() => {
    inventoryApi.getCategory(id, 'virtual_machines')
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]))
    rvtoolsApi.get(id)
      .then(r => { if (r.data.exists) setRvtoolsInfo(r.data) })
      .catch(() => {})
  }, [id])

  const doSave = useCallback(async () => {
    await inventoryApi.saveCategory(id, 'virtual_machines', items)
  }, [id, items])

  const { isDirty, lastSaved, markClean } = useAutoSave(items, doSave)
  const fmtTime = (d) => d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''

  const save = async () => {
    setSaving(true)
    try {
      await inventoryApi.saveCategory(id, 'virtual_machines', items)
      markClean()
      toast.success('Đã lưu Virtual Machines')
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const clearAll = async () => {
    if (items.length === 0) return
    if (!window.confirm(`Xóa tất cả ${items.length} VMs khỏi danh sách?\n(Không xóa dữ liệu RVTools đã import)\nDữ liệu sẽ bị xóa và lưu ngay lập tức.`)) return
    setClearing(true)
    try {
      setItems([])
      await inventoryApi.saveCategory(id, 'virtual_machines', [])
      markClean()
      toast.success('Đã xóa tất cả Virtual Machines')
    } catch {
      toast.error('Lỗi khi xóa')
    } finally {
      setClearing(false)
    }
  }

  // ── Core import logic ──────────────────────────────────────────────────────

  const doImport = async (files, mode /* 'replace' | 'merge' */) => {
    if (!files || files.length === 0) return
    setImporting(true)
    try {
      // Parse all selected files
      const parsed = []
      for (const file of files) {
        const data = await parseRVToolsFile(file)
        if (data.vinfo.length === 0) {
          toast.error(`"${file.name}": không tìm thấy sheet vInfo`)
          continue
        }
        parsed.push({ file, data })
      }
      if (parsed.length === 0) return

      // Start from empty or existing depending on mode
      const base = mode === 'merge' && rvtoolsInfo
        ? {
            vinfo:      rvtoolsInfo.vinfo      || [],
            vhost:      rvtoolsInfo.vhost      || [],
            vcluster:   rvtoolsInfo.vcluster   || [],
            vdatastore: rvtoolsInfo.vdatastore || [],
            vsnapshot:  rvtoolsInfo.vsnapshot  || [],
            vhealth:    rvtoolsInfo.vhealth    || [],
            vlicense:   rvtoolsInfo.vlicense   || [],
            vdisk:      rvtoolsInfo.vdisk      || [],
          }
        : { vinfo: [], vhost: [], vcluster: [], vdatastore: [], vsnapshot: [], vhealth: [], vlicense: [], vdisk: [] }

      // Tag every raw row with its source filename so per-file removal works
      const tagRows = (rows, fname) => rows.map(r => ({ ...r, _rvtools_file: fname }))

      let merged = base
      for (const { file, data } of parsed) {
        const tagged = {
          vinfo:      tagRows(data.vinfo,      file.name),
          vhost:      tagRows(data.vhost,      file.name),
          vcluster:   tagRows(data.vcluster,   file.name),
          vdatastore: tagRows(data.vdatastore, file.name),
          vsnapshot:  tagRows(data.vsnapshot,  file.name),
          vhealth:    tagRows(data.vhealth,    file.name),
          vlicense:   tagRows(data.vlicense,   file.name),
          vdisk:      tagRows(data.vdisk,      file.name),
        }
        merged = mergeRVTools(merged, tagged)
      }

      // Build host→ESX version map from merged vhost
      const hostVersionMap = {}
      merged.vhost.forEach(r => { if (r['Host']) hostVersionMap[r['Host']] = r['ESX Version'] || '' })

      // Build updated source_files list
      const existingFiles = mode === 'merge' ? (rvtoolsInfo?.source_files || []) : []
      const nowISO = new Date().toISOString()
      const newFiles = parsed.map(({ file, data }) => ({
        filename:    file.name,
        vm_count:    data.vinfo.length,
        imported_at: nowISO,
      }))
      // Deduplicate by filename: new entry replaces old
      const mergedFiles = [
        ...existingFiles.filter(f => !newFiles.some(n => n.filename === f.filename)),
        ...newFiles,
      ]

      const summary = buildSummary(merged)

      // Save to backend
      const saveRes = await rvtoolsApi.save(id, {
        source_filename: mergedFiles.map(f => f.filename).join(', '),
        source_files:    mergedFiles,
        ...merged,
        summary,
      })

      // Build VM list and persist
      const vms = mapVInfoToVMs(merged.vinfo, hostVersionMap)
      setItems(vms)
      await inventoryApi.saveCategory(id, 'virtual_machines', vms)

      // Update local rvtoolsInfo
      setRvtoolsInfo({
        exists: true,
        source_filename: saveRes.data.source_filename,
        source_files:    mergedFiles,
        imported_at:     saveRes.data.imported_at,
        ...merged,
        summary,
      })

      const totalVMs  = vms.length
      const fileNames = parsed.map(p => p.file.name).join(', ')
      toast.success(
        mode === 'merge'
          ? `✅ Đã gộp ${parsed.length} file → ${totalVMs} VMs tổng cộng`
          : `✅ Đã import ${totalVMs} VMs từ ${fileNames}`
      )
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi import: ' + (err.message || 'Unknown error'))
    } finally {
      setImporting(false)
      if (replaceRef.current) replaceRef.current.value = ''
      if (mergeRef.current)   mergeRef.current.value   = ''
    }
  }

  // Remove one file entry and rebuild VMs from remaining files
  const removeSourceFile = async (filename) => {
    if (!rvtoolsInfo) return
    const remaining = (rvtoolsInfo.source_files || []).filter(f => f.filename !== filename)
    if (remaining.length === 0) {
      // Clear everything
      try {
        await rvtoolsApi.save(id, {
          source_filename: '',
          source_files: [],
          vinfo: [], vhost: [], vcluster: [], vdatastore: [],
          vsnapshot: [], vhealth: [], vlicense: [], vdisk: [],
          summary: {},
        })
        setRvtoolsInfo(null)
        setItems([])
        await inventoryApi.saveCategory(id, 'virtual_machines', [])
        toast.success('Đã xóa tất cả dữ liệu RVTools')
      } catch { toast.error('Lỗi khi xóa') }
      return
    }
    // Filter vinfo by _rvtools_file tag (set during import)
    const newVinfo = (rvtoolsInfo.vinfo || []).filter(r => r._rvtools_file !== filename)
    const newVhost = (rvtoolsInfo.vhost || []).filter(r => r._rvtools_file !== filename)
    // rebuild
    const hostVersionMap = {}
    newVhost.forEach(r => { if (r['Host']) hostVersionMap[r['Host']] = r['ESX Version'] || '' })
    const vms = mapVInfoToVMs(newVinfo, hostVersionMap)
    const merged = {
      vinfo:      newVinfo,
      vhost:      newVhost,
      vcluster:   (rvtoolsInfo.vcluster   || []).filter(r => r._rvtools_file !== filename),
      vdatastore: (rvtoolsInfo.vdatastore || []).filter(r => r._rvtools_file !== filename),
      vsnapshot:  (rvtoolsInfo.vsnapshot  || []).filter(r => r._rvtools_file !== filename),
      vhealth:    (rvtoolsInfo.vhealth    || []).filter(r => r._rvtools_file !== filename),
      vlicense:   (rvtoolsInfo.vlicense   || []).filter(r => r._rvtools_file !== filename),
      vdisk:      (rvtoolsInfo.vdisk      || []).filter(r => r._rvtools_file !== filename),
    }
    try {
      await rvtoolsApi.save(id, {
        source_filename: remaining.map(f => f.filename).join(', '),
        source_files:    remaining,
        ...merged,
        summary: buildSummary(merged),
      })
      setItems(vms)
      await inventoryApi.saveCategory(id, 'virtual_machines', vms)
      setRvtoolsInfo(prev => ({ ...prev, ...merged, source_files: remaining, source_filename: remaining.map(f => f.filename).join(', ') }))
      toast.success(`Đã xóa "${filename}"`)
    } catch { toast.error('Lỗi khi xóa file') }
  }

  const sourceFiles = rvtoolsInfo?.source_files || []
  const hasRVTools  = sourceFiles.length > 0

  return (
    <div className="card space-y-3">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-3">
            <span>☁️ Virtual Machines
              <span className="text-gray-400 text-sm font-normal ml-2">({items.length} VMs)</span>
            </span>
            {isDirty && <span className="text-xs text-amber-600 font-medium">● chưa lưu</span>}
            {!isDirty && lastSaved && <span className="text-xs text-green-600">✓ tự động lưu {fmtTime(lastSaved)}</span>}
          </h3>
        </div>

        {/* Import buttons */}
        <div className="flex gap-2 items-center">
          {/* Replace-all picker */}
          <input type="file" accept=".xlsx,.xls" multiple ref={replaceRef} className="hidden"
            onChange={e => doImport(Array.from(e.target.files || []), 'replace')} />
          {/* Merge picker */}
          <input type="file" accept=".xlsx,.xls" multiple ref={mergeRef} className="hidden"
            onChange={e => doImport(Array.from(e.target.files || []), 'merge')} />

          {hasRVTools ? (
            <>
              <button
                className="btn-secondary text-xs"
                onClick={() => mergeRef.current?.click()}
                disabled={importing}
                title="Thêm file RVTools và gộp với dữ liệu hiện có"
              >
                {importing ? '⏳...' : '➕ Gộp file'}
              </button>
              <button
                className="btn-secondary text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => replaceRef.current?.click()}
                disabled={importing}
                title="Xóa toàn bộ và import lại từ đầu"
              >
                🔄 Thay thế
              </button>
            </>
          ) : (
            <button
              className="btn-secondary text-xs"
              onClick={() => replaceRef.current?.click()}
              disabled={importing}
              title="Import từ file RVTools Excel (.xlsx)"
            >
              {importing ? '⏳ Đang import...' : '📥 Import RVTools'}
            </button>
          )}
        </div>
      </div>

      {/* ── Imported files list ── */}
      {sourceFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 space-y-1">
          <p className="text-xs font-semibold text-blue-700 mb-1">
            📊 RVTools đã import ({sourceFiles.length} file{sourceFiles.length > 1 ? 's' : ''} · {items.length} VMs tổng)
          </p>
          <div className="flex flex-wrap gap-2">
            {sourceFiles.map((sf, idx) => (
              <div key={idx}
                className="flex items-center gap-1.5 bg-white border border-blue-200 rounded-full px-2.5 py-0.5 text-xs shadow-sm"
              >
                <span className="text-blue-400">📄</span>
                <span className="font-medium text-gray-700">{sf.filename}</span>
                <span className="text-gray-400">({sf.vm_count} VMs)</span>
                <button
                  onClick={() => removeSourceFile(sf.filename)}
                  className="text-gray-300 hover:text-red-500 ml-0.5 leading-none font-bold transition-colors"
                  title={`Xóa "${sf.filename}"`}
                >×</button>
              </div>
            ))}
          </div>
          {rvtoolsInfo?.imported_at && (
            <p className="text-[10px] text-blue-400 mt-0.5">
              Lần import gần nhất: {new Date(rvtoolsInfo.imported_at).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
      )}

      <InventoryTable fields={FIELDS} items={items} onChange={setItems} refs={refs} />

      <div className="flex justify-between pt-2">
        <button
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={clearAll}
          disabled={items.length === 0 || clearing || saving}
        >
          {clearing ? '⏳ Đang xóa...' : '🗑️ Xóa VMs'}
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
        </button>
      </div>
    </div>
  )
}
