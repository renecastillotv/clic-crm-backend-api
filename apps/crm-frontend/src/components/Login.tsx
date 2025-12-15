/**
 * Login.tsx - Componente legado, redirige a la nueva página de login
 * @deprecated Usar /login con Clerk en su lugar
 */

import { Navigate } from 'react-router-dom';

export default function Login() {
  return <Navigate to="/login" replace />;
}
