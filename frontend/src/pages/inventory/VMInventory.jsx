import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as inventoryApi, rvtools as rvtoolsApi } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import InventoryTable from '../../components/InventoryTable'

const FIELDS = [
  { key: 'name', label: 'Tên VM', type: 'text', width: 140 },
  { key: 'guest_os', label: 'Guest OS', type: 'text', width: 200 },
  { key: 'vcpu', label: 'vCPU', type: 'number', width: 55 },
  { key: 'ram_gb', label: 'RAM (GB)', type: 'number', width: 70 },
  { key: 'disk_gb', label: 'Disk (GB)', type: 'number', width: 70 },
  { key: 'cluster', label: 'Cluster', type: 'text', width: 110 },
  { key: 'host_server', label: 'Host', type: 'text', width: 130 },
  { key: 'datastore', label: 'Datastore', type: 'text', width: 110 },
  { key: 'hypervisor', label: 'Hypervisor', type: 'text', width: 160 },
  { key: 'environment', label: 'Môi trường', type: 'select', refType: 'environments', width: 100 },
  { key: 'power_state', label: 'Power', type: 'select', width: 80, options: ['On', 'Off', 'Suspended'] },
  { key: 'status', label: 'Trạng thái', type: 'select', refType: 'device_statuses', width: 100, default: 'Using' },
  { key: 'notes', label: 'Ghi chú', type: 'text', width: 110 },
]

function mapPowerState(ps) {
  const s = (ps || '').toLowerCase()
  if (s === 'poweredon') return 'On'
  if (s === 'poweredoff') return 'Off'
  if (s === 'suspended') return 'Suspended'
  return ps || ''
}

// Extract datastore name from RVTools Path field: "[datastore_name] vm/vm.vmx"
function extractDatastore(path) {
  const m = (path || '').match(/^\[([^\]]+)\]/)
  return m ? m[1] : ''
}

// Dynamic OS lookup — tolerates SheetJS column name variations (with/without "the", etc.)
function getGuestOS(row) {
  // Try exact names first (most common variants)
  const exact = [
    'OS according to the VMware Tools',
    'OS according to the configuration file',
    'OS according to VMware Tools',
    'OS according to configuration file',
  ]
  for (const k of exact) {
    if (row[k] && String(row[k]).trim() !== '') return String(row[k]).trim()
  }
  // Fallback: scan all keys for OS-related column (catches any encoding variation)
  const allKeys = Object.keys(row)
  const toolsKey = allKeys.find(k => k.toLowerCase().includes('os according') && k.toLowerCase().includes('tool'))
  if (toolsKey && row[toolsKey]) return String(row[toolsKey]).trim()
  const cfgKey = allKeys.find(k => k.toLowerCase().includes('os according'))
  if (cfgKey && row[cfgKey]) return String(row[cfgKey]).trim()
  return ''
}

// Strip build number from ESX version string
// "VMware ESXi 8.0.3 build-24859861" → "VMware ESXi 8.0.3"
function cleanEsxVersion(v) {
  return (v || '').replace(/\s+build-\S+/i, '').trim()
}

function mapVInfoToVMs(vinfo, hostVersionMap) {
  return vinfo.map((row, i) => ({
    id: Date.now() + i,
    name: row['VM'] || row['Name'] || '',
    guest_os: getGuestOS(row),
    vcpu: Number(row['CPUs'] || row['CPU'] || 0),
    ram_gb: Math.round(Number(row['Memory'] || 0) / 1024),
    disk_gb: Math.round(Number(row['Total disk capacity MiB'] || row['Provisioned MiB'] || 0) / 1024),
    cluster: row['Cluster'] || '',
    host_server: row['Host'] || '',
    datastore: extractDatastore(row['Path']) || '',
    hypervisor: cleanEsxVersion(hostVersionMap?.[row['Host']]) || 'VMware vSphere',
    environment: '',
    power_state: mapPowerState(row['Powerstate'] || ''),
    status: 'Using',
    notes: row['Annotation'] || '',
  }))
}

export default function VMInventory() {
  const { id } = useParams()
  const refs = useRefs()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [rvtoolsInfo, setRvtoolsInfo] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    inventoryApi.getCategory(id, 'virtual_machines')
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]))
    rvtoolsApi.get(id)
      .then(r => { if (r.data.exists) setRvtoolsInfo(r.data) })
      .catch(() => {})
  }, [id])

  const save = async () => {
    setSaving(true)
    try {
      await inventoryApi.saveCategory(id, 'virtual_machines', items)
      toast.success('Đã lưu Virtual Machines')
    } catch {
      toast.error('Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })

      const getSheet = (name) => {
        const sn = wb.SheetNames.find(n => n.toLowerCase() === name.toLowerCase())
        if (!sn) return []
        return XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' })
      }

      const vinfo = getSheet('vInfo')
      const vhost = getSheet('vHost')
      const vcluster = getSheet('vCluster')
      const vdatastore = getSheet('vDatastore')
      const vsnapshot = getSheet('vSnapshot')
      const vhealth = getSheet('vHealth')
      const vlicense = getSheet('vLicense')
      const vdisk = getSheet('vDisk')

      if (vinfo.length === 0) {
        toast.error('Không tìm thấy sheet vInfo trong file Excel')
        return
      }

      // Build host → ESX version lookup (ESX Version column from vHost sheet)
      const hostVersionMap = {}
      vhost.forEach(r => {
        if (r['Host']) hostVersionMap[r['Host']] = r['ESX Version'] || ''
      })

      const poweredOn = vinfo.filter(r =>
        (r['Powerstate'] || '').toLowerCase() === 'poweredon'
      ).length
      const totalVcpu = vinfo.reduce((s, r) => s + Number(r['CPUs'] || 0), 0)
      const totalRamMiB = vinfo.reduce((s, r) => s + Number(r['Memory'] || 0), 0)
      const totalDiskMiB = vinfo.reduce((s, r) => s + Number(r['Total disk capacity MiB'] || 0), 0)

      const summary = {
        total_vms: vinfo.length,
        powered_on: poweredOn,
        powered_off: vinfo.length - poweredOn,
        total_vcpu: totalVcpu,
        total_ram_gib: Math.round(totalRamMiB / 1024),
        total_disk_tb: Math.round(totalDiskMiB / 1024 / 1024 * 10) / 10,
        host_count: vhost.length,
        cluster_count: vcluster.length,
        datastore_count: vdatastore.length,
        snapshot_count: vsnapshot.length,
        health_warning_count: vhealth.length,
      }

      await rvtoolsApi.save(id, {
        source_filename: file.name,
        vinfo, vhost, vcluster, vdatastore, vsnapshot, vhealth, vlicense, vdisk,
        summary,
      })

      const vms = mapVInfoToVMs(vinfo, hostVersionMap)
      setItems(vms)
      await inventoryApi.saveCategory(id, 'virtual_machines', vms)
      setRvtoolsInfo({ exists: true, source_filename: file.name })

      toast.success(`✅ Đã import ${vms.length} VMs từ ${file.name}`)
    } catch (err) {
      console.error(err)
      toast.error('Lỗi khi import: ' + (err.message || 'Unknown error'))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-800">
            ☁️ Virtual Machines
            <span className="text-gray-400 text-sm font-normal ml-2">({items.length} thiết bị)</span>
          </h3>
          {rvtoolsInfo?.source_filename && (
            <p className="text-xs text-gray-500 mt-0.5">
              📊 RVTools: <span className="font-medium">{rvtoolsInfo.source_filename}</span>
              {rvtoolsInfo.imported_at && (
                <span className="ml-1">• {new Date(rvtoolsInfo.imported_at).toLocaleString()}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileRef}
            className="hidden"
            onChange={handleImport}
          />
          <button
            className="btn-secondary text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            title="Import từ file RVTools Excel (.xlsx)"
          >
            {importing ? '⏳ Đang import...' : '📥 Import RVTools'}
          </button>
        </div>
      </div>

      <InventoryTable fields={FIELDS} items={items} onChange={setItems} refs={refs} />

      <div className="flex justify-end pt-2">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
        </button>
      </div>
    </div>
  )
}
