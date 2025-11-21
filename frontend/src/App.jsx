import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import PeoplePage from './pages/PeoplePage';
import PersonDetailPage from './pages/PersonDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import SearchPage from './pages/SearchPage';
import SharePage from './pages/SharePage';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminPeoplePage from './pages/AdminPeoplePage';
import AdminProjectsPage from './pages/AdminProjectsPage';
import AdminPersonEditPage from './pages/AdminPersonEditPage';
import AdminProjectEditPage from './pages/AdminProjectEditPage';
import AdminBulkUploadPage from './pages/AdminBulkUploadPage';
import AdminTaxonomyPage from './pages/AdminTaxonomyPage';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProgressProvider } from './contexts/LoadingProgressContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProgressBar from './components/ProgressBar';

function App() {
  return (
    <AuthProvider>
      <LoadingProgressProvider>
        <Toaster position="top-right" richColors />
        <ProgressBar />
        <div className="app">
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/people" element={<PersonDetailPage />} />
          <Route path="/people/:slug" element={<PersonDetailPage />} />
          <Route path="/projects" element={<PersonDetailPage />} />
          <Route path="/projects/:slug" element={<PersonDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/share" element={<SharePage />} />
          
          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/people" element={<ProtectedRoute><AdminPeoplePage /></ProtectedRoute>} />
          <Route path="/admin/people/:slug/edit" element={<ProtectedRoute><AdminPersonEditPage /></ProtectedRoute>} />
          <Route path="/admin/projects" element={<ProtectedRoute><AdminProjectsPage /></ProtectedRoute>} />
          <Route path="/admin/projects/:slug/edit" element={<ProtectedRoute><AdminProjectEditPage /></ProtectedRoute>} />
          <Route path="/admin/bulk-upload" element={<ProtectedRoute><AdminBulkUploadPage /></ProtectedRoute>} />
          <Route path="/admin/taxonomy" element={<ProtectedRoute><AdminTaxonomyPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </LoadingProgressProvider>
    </AuthProvider>
  );
}

export default App;

