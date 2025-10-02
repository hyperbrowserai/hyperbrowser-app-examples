'use client';

import { useState } from 'react';
import { DocumentationProvider, useDocumentation } from '@/contexts/DocumentationContext';
import { UrlInput } from '@/components/UrlInput';
import { ChatInterface } from '@/components/ChatInterface';
import { LoadingState } from '@/components/LoadingState';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

function DocumentationBuddyContent() {
  const { currentDocumentation, isLoading, apiKey, setApiKey } = useDocumentation();
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="min-h-screen relative">

      
      <Navbar 
        apiKey={apiKey}
        onOpenSidebar={() => setShowSidebar(true)}
      />
      
      {/* Main Content */}
      <div className="relative z-10 px-4 pb-8">
        {isLoading ? (
          <LoadingState />
        ) : currentDocumentation ? (
          <ChatInterface />
        ) : (
          <UrlInput />
        )}
      </div>

      {/* Sidebar */}
      <Sidebar
        showSidebar={showSidebar}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onClose={() => setShowSidebar(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <DocumentationProvider>
      <DocumentationBuddyContent />
    </DocumentationProvider>
  );
}
