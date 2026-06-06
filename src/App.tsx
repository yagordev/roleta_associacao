
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Operator } from './pages/Operator';
import { PublicScreen } from './pages/PublicScreen';
import { ClientRemote } from './pages/ClientRemote';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/tela-publica" replace />} />
          <Route path="/tela-publica" element={<PublicScreen />} />
          <Route path="/celular" element={<ClientRemote />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/operador" 
            element={
              <ProtectedRoute>
                <Operator />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
