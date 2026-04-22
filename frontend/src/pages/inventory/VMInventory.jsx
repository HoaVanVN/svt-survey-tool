import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventory as inventoryApi, rvtools as rvtoolsApi } from '../../api'
import { useRefs } from '../../hooks/useRefs'
import InventoryTable from '../../components/InventoryTable'

const FIELDS = [
  { key: 'name', label: 'Tên VM', type: 'text', width: 130 },
  { key: 'guest_os', label: 'Guest OS', type: 'select', refType: 'os_list', width: 150 },
  { key: 'vcpu', label: 'vCPU', type: 'number', width: 55 },
  { key: 'ram_gb', label: 'RAM (GB)', type: 'number', width: 70 },
  { key: 'disk_gb', label: 'Disk (GB)', type: 'number', width: 70 },
  { key: 'host_server', label: 'Host / Cluster', type: 'text', width: 120 },
  { key: 'datastore', label: 'Datastore', type: 'text', width: 110 },
  { key: 'hypervisor', label: 'Hypervisor', type: 'select', refType: 'hypervisors', width: 130 },
  { key: 'environment', label: 'Môi trường', type: 'select', refType: 'environments', width: 100 },
  { key: 'power_state', label: 'Power', type: 'select', width: 80, options: ['On', 'Off', 'Suspended'] },
  { key: 'support_until', label: 'Support Until', type: 'eos', width: 95 },
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

function mapVInfoToVMs(vinfo) {
  return vinfo.map((row, i) => {
    const cluster = row['Cluster'] || ''
    const host = row['Host'] || ''
    const hostCluster = cluster && host
      ? `${cluster} / ${host}`
      : cluster || host

    const datastores = row['Datastore(s)'] || row['Datastores'] || row['Datastore'] || ''
    const firstDS = datastores.toString().split(',')[0].trim()

    return {
      id: Date.now() + i,
      name: row['VM'] || row['Name'] || '',
      guest_os: row['OS according to VMware Tools'] || row['OS according to configuration file'] || '',
      vcpu: Number(row['CPUs'] || row['CPU'] || 0),
      ram_gb: Math.round(Number(row['Memory'] || row['Memory (MiB)'] || 0) / 1024),
      disk_gb: Math.round(Number(row['Total disk capacity MiB'] || row['Provisioned MiB'] || 0) / 1024),
      host_server: hostCluster,
      datastore: firstDS,
      hypervisor: 'VMware vSphere',
      environment: '',
      power_state: mapPowerState(row['Powerstate'] || row['Power state'] || ''),
      support_until: '',
      status: 'Using',
      notes: row['Annotation'] || row['Description'] || '',
    }
  })
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

      const poweredOn = vinfo.filter(r =>
        (r['Powerstate'] || '').toLowerCase() === 'poweredon'
      ).length
      const totalVcpu = vinfo.reduce((s, r) => s + Number(r['CPUs'] || 0), 0)
      const totalRamMiB = vinfo.reduce((s, r) =>
        s + Number(r['Memory'] || r['Memory (MiB)'] || 0), 0)
      const totalDiskMiB = vinfo.reduce((s, r) =>
        s + Number(r['Total disk capacity MiB'] || 0), 0)

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

      const vms = mapVInfoToVMs(vinfo)
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
