/**
 * LoginPage - Página de inicio de sesión con Clerk
 */

import { SignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '20px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: '30px' }}>
          <h1
            style={{
              color: '#fff',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            🏠 CRM Inmobiliario
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '10px' }}>
            Plataforma multi-tenant para inmobiliarias
          </p>
        </div>

        {/* Clerk SignIn */}
        <SignIn
          appearance={{
            elements: {
              rootBox: {
                margin: '0 auto',
              },
              card: {
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              },
              headerTitle: {
                color: '#f1f5f9',
              },
              headerSubtitle: {
                color: '#94a3b8',
              },
              formFieldLabel: {
                color: '#cbd5e1',
              },
              formFieldInput: {
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                color: '#f1f5f9',
              },
              formButtonPrimary: {
                backgroundColor: '#3b82f6',
                '&:hover': {
                  backgroundColor: '#2563eb',
                },
              },
              footerActionLink: {
                color: '#3b82f6',
              },
              dividerLine: {
                backgroundColor: '#334155',
              },
              dividerText: {
                color: '#64748b',
              },
              socialButtonsBlockButton: {
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                color: '#f1f5f9',
                '&:hover': {
                  backgroundColor: '#334155',
                },
              },
            },
          }}
          routing="path"
          path="/login"
          signUpUrl="/signup"
          afterSignInUrl="/dashboard"
        />
      </div>
    </div>
  );
}
