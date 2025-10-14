import { useEffect, useState } from 'react';
import ResetPasswordForm from './auth/ResetPasswordForm';
import ResetPasswordAdminForm from './auth/ResetPasswordAdminForm';

interface PasswordResetHandlerProps {
  onSuccess: () => void;
}

export default function PasswordResetHandler({ onSuccess }: PasswordResetHandlerProps) {
  const [token, setToken] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('🔐 PasswordResetHandler: Checking URL for token');
    
    const hash = window.location.hash.slice(1);
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    console.log('🔐 URL Analysis:', {
      hash,
      token: urlToken ? urlToken.substring(0, 10) + '...' : 'none',
      fullUrl: window.location.href
    });

    if (urlToken) {
      setToken(urlToken);
      setIsAdmin(hash === 'admin-reset-password');
      console.log('🔐 Token found, rendering form:', { isAdmin: hash === 'admin-reset-password' });
    } else {
      console.log('❌ No token found in URL, redirecting to login');
      onSuccess(); // This will redirect to login
    }
    
    setIsLoading(false);
  }, [onSuccess]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <div className="text-lg mb-2">🔐 Verificando enlace de recuperación...</div>
          <div className="text-sm text-gray-400">PasswordResetHandler activo</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <h1 className="text-xl mb-4">❌ Enlace de recuperación inválido</h1>
          <p className="mb-4">El enlace no contiene un token válido</p>
          <button 
            onClick={onSuccess}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <ResetPasswordAdminForm
        token={token}
        onSuccess={onSuccess}
      />
    );
  } else {
    return (
      <ResetPasswordForm
        token={token}
        onSuccess={onSuccess}
      />
    );
  }
}