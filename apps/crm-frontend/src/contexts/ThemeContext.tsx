import { createContext, useContext, useState, ReactNode } from 'react';
import { TemaColores } from '../types/componentes';

interface ThemeContextType {
  tema: TemaColores;
  setTema: (tema: Partial<TemaColores>) => void;
  resetTema: () => void;
}

const temaDefault: TemaColores = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f56565',
  background: '#ffffff',
  text: '#1a202c',
  textSecondary: '#718096',
  border: '#e2e8f0',
  success: '#48bb78',
  warning: '#ed8936',
  error: '#f56565',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, temaInicial }: { children: ReactNode; temaInicial?: Partial<TemaColores> }) {
  const [tema, setTemaState] = useState<TemaColores>({
    ...temaDefault,
    ...temaInicial,
  });

  const setTema = (nuevoTema: Partial<TemaColores>) => {
    setTemaState(prev => ({
      ...prev,
      ...nuevoTema,
    }));
  };

  const resetTema = () => {
    setTemaState(temaDefault);
  };

  return (
    <ThemeContext.Provider
      value={{
        tema,
        setTema,
        resetTema,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}



