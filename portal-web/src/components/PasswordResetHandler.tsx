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
    // Parse hash correctly for hash router
    const fullHash = window.location.hash.slice(1) || ''; // Remove #
    const [hashPath = '', hashQuery = ''] = fullHash.split('?');
    const urlParams = new URLSearchParams(hashQuery || window.location.search || '');
    const urlToken = urlParams.get('token');

    if (urlToken && typeof urlToken === 'string') {
      setToken(urlToken);
      setIsAdmin(hashPath.includes('admin-reset-password'));
    } else {
      // Redirect to login if no valid token
      window.location.href = window.location.origin + window.location.pathname + '#login';
    }

    setIsLoading(false);
  }, []); // Empty deps - run only once

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