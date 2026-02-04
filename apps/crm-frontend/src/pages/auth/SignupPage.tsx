/**
 * SignupPage - Página de registro con Clerk
 * Estilo Denlla B2B Enterprise
 */

import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export default function SignupPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F1115',
        padding: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1
              style={{
                color: '#FFFFFF',
                fontSize: '1.75rem',
                fontWeight: 600,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Denlla
            </h1>
          </Link>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px', fontSize: '0.9375rem' }}>
            Crea tu cuenta para empezar
          </p>
        </div>

        {/* Clerk SignUp */}
        <SignUp
          appearance={{
            elements: {
              rootBox: {
                margin: '0 auto',
              },
              card: {
                backgroundColor: '#1A1D21',
                border: '1px solid #2A2E34',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              },
              headerTitle: {
                color: '#FFFFFF',
                fontWeight: 600,
              },
              headerSubtitle: {
                color: 'rgba(255, 255, 255, 0.5)',
              },
              formFieldLabel: {
                color: 'rgba(255, 255, 255, 0.7)',
              },
              formFieldInput: {
                backgroundColor: '#121417',
                borderColor: '#3A3F45',
                color: '#FFFFFF',
                '&:focus': {
                  borderColor: '#2563EB',
                  boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)',
                },
              },
              formButtonPrimary: {
                backgroundColor: '#2563EB',
                '&:hover': {
                  backgroundColor: '#1D4ED8',
                },
              },
              footerActionLink: {
                color: '#2563EB',
                '&:hover': {
                  color: '#1D4ED8',
                },
              },
              dividerLine: {
                backgroundColor: '#2A2E34',
              },
              dividerText: {
                color: 'rgba(255, 255, 255, 0.4)',
              },
              socialButtonsBlockButton: {
                backgroundColor: '#121417',
                borderColor: '#3A3F45',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#2A2E34',
                  borderColor: '#4A5057',
                },
              },
              identityPreviewEditButton: {
                color: '#2563EB',
              },
              formFieldInputShowPasswordButton: {
                color: 'rgba(255, 255, 255, 0.5)',
              },
              otpCodeFieldInput: {
                backgroundColor: '#121417',
                borderColor: '#3A3F45',
                color: '#FFFFFF',
              },
              alert: {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#EF4444',
              },
              alertText: {
                color: '#FCA5A5',
              },
            },
          }}
          routing="path"
          path="/signup"
          signInUrl="/login"
          afterSignUpUrl="/dashboard"
        />
      </div>
    </div>
  );
}
