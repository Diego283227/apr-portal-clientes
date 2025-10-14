import { useState, useEffect, useCallback } from 'react';

export interface ExcludedTerm {
  id: string;
  term: string;
  reason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useExcludedTermsSimple = () => {
  const [excludedTerms, setExcludedTerms] = useState<ExcludedTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Función para cargar términos excluidos
  const loadExcludedTerms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai-assistant/excluded-terms', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setExcludedTerms(data.terms || []);
        setLastUpdate(new Date());
      } else {
        throw new Error('Error al cargar términos excluidos');
      }
    } catch (err) {
      console.error('Error loading excluded terms:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar términos al montar el componente
  useEffect(() => {
    loadExcludedTerms();
  }, [loadExcludedTerms]);

  // Funciones utilitarias
  const getActiveTerms = useCallback(() => {
    return excludedTerms.filter(term => term.isActive);
  }, [excludedTerms]);

  const isTermExcluded = useCallback((message: string): {
    isExcluded: boolean;
    foundTerm?: ExcludedTerm;
    error?: string;
  } => {
    try {
      const messageText = message.toLowerCase().trim();
      const activeTerms = getActiveTerms();

      for (const term of activeTerms) {
        const termText = term.term.toLowerCase();

        if (messageText.includes(termText)) {
          return {
            isExcluded: true,
            foundTerm: term,
            error: `El término "${term.term}" no está permitido${term.reason ? `: ${term.reason}` : ''}.`
          };
        }
      }

      return { isExcluded: false };
    } catch (error) {
      console.error('Error in isTermExcluded:', error);
      return { isExcluded: false };
    }
  }, [getActiveTerms]);

  const validateMessage = useCallback(async (message: string): Promise<{
    isValid: boolean;
    foundTerm?: ExcludedTerm;
    error?: string;
  }> => {
    try {
      // Solo validación local
      const localValidation = isTermExcluded(message);
      return {
        isValid: !localValidation.isExcluded,
        foundTerm: localValidation.foundTerm,
        error: localValidation.error
      };
    } catch (error) {
      console.error('Error in validateMessage:', error);
      // En caso de error, permitir el mensaje
      return { isValid: true };
    }
  }, [isTermExcluded]);

  const refreshTerms = useCallback(() => {
    loadExcludedTerms();
  }, [loadExcludedTerms]);

  return {
    excludedTerms,
    activeTerms: getActiveTerms(),
    loading,
    error,
    lastUpdate,
    isTermExcluded,
    validateMessage,
    refreshTerms,
    // Métricas útiles
    totalTerms: excludedTerms.length,
    activeTermsCount: getActiveTerms().length,
    inactiveTermsCount: excludedTerms.filter(t => !t.isActive).length
  };
};

export default useExcludedTermsSimple;