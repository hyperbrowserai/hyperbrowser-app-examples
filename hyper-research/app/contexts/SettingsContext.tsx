"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SettingsContextType {
  hyperbrowserKey: string;
  openaiKey: string;
  anthropicKey: string;
  setHyperbrowserKey: (key: string) => void;
  setOpenaiKey: (key: string) => void;
  setAnthropicKey: (key: string) => void;
  isHyperbrowserKeySet: boolean;
  isOpenaiKeySet: boolean;
  isAnthropicKeySet: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [hyperbrowserKey, setHyperbrowserKeyState] = useState('');
  const [openaiKey, setOpenaiKeyState] = useState('');
  const [anthropicKey, setAnthropicKeyState] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedHB = localStorage.getItem('hyperbrowser_api_key');
      const storedOAI = localStorage.getItem('openai_api_key');
      const storedAnthropic = localStorage.getItem('anthropic_api_key');
      if (storedHB) setHyperbrowserKeyState(storedHB);
      if (storedOAI) setOpenaiKeyState(storedOAI);
      if (storedAnthropic) setAnthropicKeyState(storedAnthropic);
      setIsLoaded(true);
    }
  }, []);

  const setHyperbrowserKey = useCallback((key: string) => {
    setHyperbrowserKeyState(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hyperbrowser_api_key', key);
    }
  }, []);

  const setOpenaiKey = useCallback((key: string) => {
    setOpenaiKeyState(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('openai_api_key', key);
    }
  }, []);

  const setAnthropicKey = useCallback((key: string) => {
    setAnthropicKeyState(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('anthropic_api_key', key);
    }
  }, []);

  const isHyperbrowserKeySet = Boolean(hyperbrowserKey);
  const isOpenaiKeySet = Boolean(openaiKey);
  const isAnthropicKeySet = Boolean(anthropicKey);

  if (!isLoaded) {
    return null;
  }

  return (
    <SettingsContext.Provider value={{ 
      hyperbrowserKey, 
      openaiKey,
      anthropicKey,
      setHyperbrowserKey, 
      setOpenaiKey,
      setAnthropicKey,
      isHyperbrowserKeySet,
      isOpenaiKeySet,
      isAnthropicKeySet
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
