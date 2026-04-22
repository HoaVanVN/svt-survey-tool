import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import CustomerList from './pages/CustomerList'
import Settings from './pages/Settings'
import CustomerDetail from './pages/CustomerDetail'
import InventoryLayout from './pages/inventory/InventoryLayout'
import ServerInventory from './pages/inventory/ServerInventory'
import SANInventory from './pages/inventory/SANInventory'
import StorageInventory from './pages/inventory/StorageInventory'
import NetworkInventory from './pages/inventory/NetworkInventory'
import WiFiInventory from './pages/inventory/WiFiInventory'
import ApplicationInventory from './pages/inventory/ApplicationInventory'
import InventoryReport from './pages/inventory/InventoryReport'
import SizingLayout from './pages/sizing/SizingLayout'
import WorkloadSurvey from './pages/WorkloadSurvey'
import NetworkSurvey from './pages/NetworkSurvey'
import BackupSurvey from './pages/BackupSurvey'
import SecuritySurvey from './pages/SecuritySurvey'
import OCPSurvey from './pages/OCPSurvey'
import SizingResults from './pages/SizingResults'
import SizingReport from './pages/sizing/SizingReport'
import OCPVirtSizing from './pages/sizing/OCPVirtSizing'
import VMInventory from './pages/inventory/VMInventory'
import RVToolsReport from './pages/inventory/RVToolsReport'

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/customers" replace />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="customers/:id" element={<CustomerDetail />}>
            <Route index element={<Navigate to="inventory/servers" replace />} />
            {/* Legacy URL redirects */}
            <Route path="workload" element={<Navigate to="sizing/workload" replace />} />
            <Route path="network" element={<Navigate to="sizing/network" replace />} />
            <Route path="backup" element={<Navigate to="sizing/backup" replace />} />
            <Route path="security" element={<Navigate to="sizing/security" replace />} />
            <Route path="ocp" element={<Navigate to="sizing/ocp" replace />} />
            <Route path="sizing-results" element={<Navigate to="sizing/results" replace />} />
            <Route path="inventory" element={<InventoryLayout />}>
              <Route index element={<Navigate to="servers" replace />} />
              <Route path="servers" element={<ServerInventory />} />
              <Route path="san-switches" element={<SANInventory />} />
              <Route path="storage" element={<StorageInventory />} />
              <Route path="network-devices" element={<NetworkInventory />} />
              <Route path="wifi" element={<WiFiInventory />} />
              <Route path="vms" element={<VMInventory />} />
              <Route path="applications" element={<ApplicationInventory />} />
              <Route path="report" element={<InventoryReport />} />
              <Route path="rvtools-report" element={<RVToolsReport />} />
            </Route>
            <Route path="sizing" element={<SizingLayout />}>
              <Route index element={<Navigate to="workload" replace />} />
              <Route path="workload" element={<WorkloadSurvey />} />
              <Route path="network" element={<NetworkSurvey />} />
              <Route path="backup" element={<BackupSurvey />} />
              <Route path="security" element={<SecuritySurvey />} />
              <Route path="ocp" element={<OCPSurvey />} />
              <Route path="ocp-virt" element={<OCPVirtSizing />} />
              <Route path="results" element={<SizingResults />} />
              <Route path="report" element={<SizingReport />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  )
}
