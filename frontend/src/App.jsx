import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import CustomerList from './pages/CustomerList'
import CustomerDetail from './pages/CustomerDetail'
import WorkloadSurvey from './pages/WorkloadSurvey'
import NetworkSurvey from './pages/NetworkSurvey'
import BackupSurvey from './pages/BackupSurvey'
import InventorySurvey from './pages/InventorySurvey'
import SecuritySurvey from './pages/SecuritySurvey'
import OCPSurvey from './pages/OCPSurvey'
import SizingResults from './pages/SizingResults'

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/customers" replace />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />}>
            <Route index element={<Navigate to="workload" replace />} />
            <Route path="workload" element={<WorkloadSurvey />} />
            <Route path="network" element={<NetworkSurvey />} />
            <Route path="backup" element={<BackupSurvey />} />
            <Route path="inventory" element={<InventorySurvey />} />
            <Route path="security" element={<SecuritySurvey />} />
            <Route path="ocp" element={<OCPSurvey />} />
            <Route path="sizing" element={<SizingResults />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
