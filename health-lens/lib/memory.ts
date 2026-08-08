// Memory system for persisting chats and files across sessions

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  hasResearch?: boolean; // Flag if this message used research
}

export interface FileMemory {
  id: string;
  filename: string;
  fileType: string;
  uploadedAt: number;
  rawText?: string; // Full text content from the file
  fileData?: string; // Base64 encoded file data for PDFs
  markers?: Array<{
    name: string;
    value: string;
    unit?: string;
  }>;
  summary?: string;
  researchStatus?: "pending" | "completed" | "failed";
  researchQueries?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  files: FileMemory[];
  createdAt: number;
  updatedAt: number;
}

export interface HealthProfile {
  files: FileMemory[];
  allPastMessages: ChatMessage[]; // Summary of all past messages for context
  lastUpdated: number;
}

export interface ConversationsStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  globalProfile: HealthProfile; // Shared across all conversations
}

const CONVERSATIONS_KEY = "health-conversations";
const MAX_CONVERSATIONS = 50; // Keep last 50 conversations
const MAX_MESSAGES_PER_CONVERSATION = 100; // Keep up to 100 messages per conversation
const MAX_GLOBAL_MESSAGES = 500; // Keep last 500 messages globally for context

// Get all conversations
function getStore(): ConversationsStore {
  if (typeof window === "undefined") {
    return {
      conversations: [],
      activeConversationId: null,
      globalProfile: { files: [], allPastMessages: [], lastUpdated: Date.now() },
    };
  }

  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    if (!stored) {
      return {
        conversations: [],
        activeConversationId: null,
        globalProfile: { files: [], allPastMessages: [], lastUpdated: Date.now() },
      };
    }

    const store: ConversationsStore = JSON.parse(stored);

    // Ensure globalProfile exists (for backwards compatibility)
    if (!store.globalProfile) {
      store.globalProfile = { files: [], allPastMessages: [], lastUpdated: Date.now() };
    }

    return store;
  } catch (error) {
    console.error("Error reading conversations:", error);
    return {
      conversations: [],
      activeConversationId: null,
      globalProfile: { files: [], allPastMessages: [], lastUpdated: Date.now() },
    };
  }
}

// Save conversations store
function saveStore(store: ConversationsStore): void {
  if (typeof window === "undefined") return;

  try {
    // Trim conversations if needed (keep most recent)
    if (store.conversations.length > MAX_CONVERSATIONS) {
      store.conversations = store.conversations
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CONVERSATIONS);
    }

    // Trim messages in each conversation
    store.conversations.forEach(conv => {
      if (conv.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
        conv.messages = conv.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
      }
    });

    // Trim global messages
    if (store.globalProfile.allPastMessages.length > MAX_GLOBAL_MESSAGES) {
      store.globalProfile.allPastMessages = store.globalProfile.allPastMessages.slice(-MAX_GLOBAL_MESSAGES);
    }

    store.globalProfile.lastUpdated = Date.now();

    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Error saving conversations:", error);
  }
}

// Create a new conversation
export function createConversation(): Conversation {
  const newConversation: Conversation = {
    id: Date.now().toString(),
    title: "New Chat",
    messages: [],
    files: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const store = getStore();
  store.conversations.push(newConversation);
  store.activeConversationId = newConversation.id;
  saveStore(store);

  return newConversation;
}

// Get active conversation
export function getActiveConversation(): Conversation | null {
  const store = getStore();

  if (!store.activeConversationId) {
    return null;
  }

  const conversation = store.conversations.find(
    c => c.id === store.activeConversationId
  );

  return conversation || null;
}

// Get all conversations
export function getAllConversations(): Conversation[] {
  const store = getStore();
  return store.conversations.sort((a, b) => b.updatedAt - a.updatedAt);
}

// Set active conversation
export function setActiveConversation(conversationId: string): void {
  const store = getStore();
  store.activeConversationId = conversationId;
  saveStore(store);
}

// Delete a conversation
export function deleteConversation(conversationId: string): void {
  const store = getStore();
  store.conversations = store.conversations.filter(c => c.id !== conversationId);

  // If deleted conversation was active, clear active
  if (store.activeConversationId === conversationId) {
    store.activeConversationId = null;
  }

  saveStore(store);
}

// Add a message to active conversation
export function addMessage(message: ChatMessage): void {
  let store = getStore();

  // Always add to global profile for cross-conversation memory
  store.globalProfile.allPastMessages.push(message);

  // Find active conversation in the current store
  let activeConv = store.activeConversationId 
    ? store.conversations.find(c => c.id === store.activeConversationId) 
    : null;

  if (!activeConv) {
    // No active conversation, create one
    const newConv = createConversation();
    
    // Get fresh store after conversation creation
    store = getStore();
    activeConv = store.conversations.find(c => c.id === newConv.id) || null;
    
    if (activeConv) {
      activeConv.messages.push(message);

      // Generate title from first user message
      if (message.role === "user" && activeConv.title === "New Chat") {
        // Generate a better title by removing common filler words and truncating
        let title = message.content
          .replace(/^(hey|hi|hello|can you|could you|please|i need|i want to|i would like to)\s+/gi, '')
          .trim();
        
        // Capitalize first letter
        title = title.charAt(0).toUpperCase() + title.slice(1);
        
        // Truncate if too long
        if (title.length > 50) {
          title = title.slice(0, 47) + "...";
        }
        
        activeConv.title = title || "New Chat";
      }

      activeConv.updatedAt = Date.now();
      saveStore(store);
    }
    return;
  }

  // Add to existing conversation
  activeConv.messages.push(message);

  // Update title if it's still "New Chat" and this is a user message
  if (message.role === "user" && activeConv.title === "New Chat") {
    // Generate a better title by removing common filler words and truncating
    let title = message.content
      .replace(/^(hey|hi|hello|can you|could you|please|i need|i want to|i would like to)\s+/gi, '')
      .trim();
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Truncate if too long
    if (title.length > 50) {
      title = title.slice(0, 47) + "...";
    }
    
    activeConv.title = title || "New Chat";
  }

  activeConv.updatedAt = Date.now();
  saveStore(store);
}

// Add a file to active conversation AND global profile
export function addFile(file: FileMemory): void {
  const store = getStore();

  // Check if file already exists in global profile
  const globalExists = store.globalProfile.files.some(
    f => f.filename === file.filename &&
    Math.abs(f.uploadedAt - file.uploadedAt) < 1000
  );

  // Always add to global profile (shared across all conversations)
  if (!globalExists) {
    store.globalProfile.files.push(file);
  }

  const activeConv = getActiveConversation();

  if (!activeConv) {
    // No active conversation, create one
    const newConv = createConversation();
    newConv.files.push(file);
    newConv.updatedAt = Date.now();
    saveStore(store);
    return;
  }

  // Check if file already exists in current conversation
  const exists = activeConv.files.some(
    f => f.filename === file.filename &&
    Math.abs(f.uploadedAt - file.uploadedAt) < 1000
  );

  if (!exists) {
    activeConv.files.push(file);
    activeConv.updatedAt = Date.now();
    saveStore(store);
  } else {
    // File already in conversation, but we added to global, so save
    saveStore(store);
  }
}

// Get all files from global profile (shared across all conversations)
export function getAllFiles(): FileMemory[] {
  const store = getStore();
  return store.globalProfile.files;
}

// Delete a file from global profile
export function deleteFile(fileId: string): void {
  const store = getStore();
  
  // Remove from global profile
  store.globalProfile.files = store.globalProfile.files.filter(f => f.id !== fileId);
  
  // Remove from all conversations
  store.conversations.forEach(conv => {
    conv.files = conv.files.filter(f => f.id !== fileId);
  });
  
  saveStore(store);
}

// Get global health profile
export function getGlobalProfile(): HealthProfile {
  const store = getStore();
  return store.globalProfile;
}

// Build context string for AI from GLOBAL profile (all conversations)
export function buildContextForAI(): string {
  const store = getStore();
  const activeConv = getActiveConversation();

  let context = "";

  // Add ALL uploaded files from global profile (shared medical data)
  if (store.globalProfile.files.length > 0) {
    context += "## User's Medical Files (Available in All Conversations):\n\n";
    store.globalProfile.files.forEach(file => {
      context += `### File: ${file.filename}\n`;
      context += `Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}\n\n`;

      // Include extracted health markers
      if (file.markers && file.markers.length > 0) {
        context += `**Extracted Health Markers:**\n`;
        file.markers.forEach(m => {
          context += `- ${m.name}: ${m.value}${m.unit ? ' ' + m.unit : ''}\n`;
        });
        context += "\n";
      }

      // Include full file content (truncated if too long)
      if (file.rawText) {
        const maxLength = 4000; // Limit per file to avoid token overflow
        const content = file.rawText.length > maxLength
          ? file.rawText.substring(0, maxLength) + "\n\n[Content truncated...]"
          : file.rawText;
        context += `**Full File Content:**\n${content}\n\n`;
      }

      context += "---\n\n";
    });
  }

  // Add context from current conversation
  if (activeConv && activeConv.messages.length > 0) {
    const recentMessages = activeConv.messages.slice(-10);
    context += "## Current Conversation:\n\n";
    recentMessages.forEach(msg => {
      const role = msg.role === "user" ? "User" : "Assistant";
      const preview = msg.content.length > 150
        ? msg.content.substring(0, 150) + "..."
        : msg.content;
      context += `${role}: ${preview}\n\n`;
    });
  }

  // Add relevant context from ALL past conversations (last 20 messages globally)
  const allPastMessages = store.globalProfile.allPastMessages.slice(-20);
  if (allPastMessages.length > 0) {
    // Filter out messages from current conversation to avoid duplication
    const pastMessagesFromOtherConvs = allPastMessages.filter(msg => {
      if (!activeConv) return true;
      return !activeConv.messages.some(m => m.id === msg.id);
    });

    if (pastMessagesFromOtherConvs.length > 0) {
      context += "## Relevant Context from Previous Conversations:\n\n";
      pastMessagesFromOtherConvs.slice(-10).forEach(msg => {
        const role = msg.role === "user" ? "User" : "Assistant";
        const preview = msg.content.length > 100
          ? msg.content.substring(0, 100) + "..."
          : msg.content;
        context += `${role}: ${preview}\n`;
      });
      context += "\n";
    }
  }

  return context;
}

// Clear all conversations
export function clearAllConversations(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONVERSATIONS_KEY);
}

// Update conversation title
export function updateConversationTitle(conversationId: string, title: string): void {
  const store = getStore();
  const conv = store.conversations.find(c => c.id === conversationId);
  if (conv) {
    conv.title = title;
    conv.updatedAt = Date.now();
    saveStore(store);
  }
}

// Start a new conversation (creates and sets as active)
export function startNewConversation(): Conversation {
  const store = getStore();
  
  // Check if there's already an empty "New Chat" conversation
  const emptyNewChat = store.conversations.find(
    c => c.title === "New Chat" && c.messages.length === 0
  );
  
  if (emptyNewChat) {
    // Just switch to it instead of creating a new one
    store.activeConversationId = emptyNewChat.id;
    saveStore(store);
    return emptyNewChat;
  }
  
  // Otherwise create a new conversation
  return createConversation();
}

