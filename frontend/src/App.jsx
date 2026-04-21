import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import CustomerList from './pages/CustomerList'
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

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/customers" replace />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />}>
            <Route index element={<Navigate to="inventory/servers" replace />} />
            <Route path="inventory" element={<InventoryLayout />}>
              <Route index element={<Navigate to="servers" replace />} />
              <Route path="servers" element={<ServerInventory />} />
              <Route path="san-switches" element={<SANInventory />} />
              <Route path="storage" element={<StorageInventory />} />
              <Route path="network-devices" element={<NetworkInventory />} />
              <Route path="wifi" element={<WiFiInventory />} />
              <Route path="applications" element={<ApplicationInventory />} />
              <Route path="report" element={<InventoryReport />} />
            </Route>
            <Route path="sizing" element={<SizingLayout />}>
              <Route index element={<Navigate to="workload" replace />} />
              <Route path="workload" element={<WorkloadSurvey />} />
              <Route path="network" element={<NetworkSurvey />} />
              <Route path="backup" element={<BackupSurvey />} />
              <Route path="security" element={<SecuritySurvey />} />
              <Route path="ocp" element={<OCPSurvey />} />
              <Route path="results" element={<SizingResults />} />
              <Route path="report" element={<SizingReport />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  )
}
