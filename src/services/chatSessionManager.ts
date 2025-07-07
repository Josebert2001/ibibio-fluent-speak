
interface ChatSession {
  id: string;
  created: Date;
  messages: Array<{
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
  }>;
  title?: string;
}

class ChatSessionManager {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;

  createSession(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ChatSession = {
      id: sessionId,
      created: new Date(),
      messages: []
    };
    
    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    
    // Save to localStorage
    this.saveToStorage();
    
    return sessionId;
  }

  addMessage(sessionId: string, message: {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp?: Date;
  }): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const fullMessage = {
      ...message,
      timestamp: message.timestamp || new Date()
    };
    
    session.messages.push(fullMessage);
    
    // Auto-generate title from first user message
    if (!session.title && message.sender === 'user' && session.messages.length <= 2) {
      session.title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
    }
    
    this.saveToStorage();
  }

  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    this.saveToStorage();
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  private saveToStorage(): void {
    try {
      const sessionsData = Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        ...session,
        created: session.created.toISOString(),
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        }))
      }));
      
      localStorage.setItem('ibibio_chat_sessions', JSON.stringify(sessionsData));
      localStorage.setItem('ibibio_current_session', this.currentSessionId || '');
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  }

  loadFromStorage(): void {
    try {
      const sessionsData = localStorage.getItem('ibibio_chat_sessions');
      const currentSession = localStorage.getItem('ibibio_current_session');
      
      if (sessionsData) {
        const parsed = JSON.parse(sessionsData);
        this.sessions.clear();
        
        parsed.forEach((sessionData: any) => {
          const session: ChatSession = {
            ...sessionData,
            created: new Date(sessionData.created),
            messages: sessionData.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          };
          
          this.sessions.set(session.id, session);
        });
      }
      
      this.currentSessionId = currentSession || null;
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }

  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';
    
    let exportText = `Ibibio Language Chat Session\n`;
    exportText += `Created: ${session.created.toLocaleString()}\n`;
    exportText += `Title: ${session.title || 'Untitled'}\n`;
    exportText += `\n${'='.repeat(50)}\n\n`;
    
    session.messages.forEach(msg => {
      const sender = msg.sender === 'user' ? 'You' : 'Ibibio Assistant';
      const time = msg.timestamp.toLocaleTimeString();
      exportText += `[${time}] ${sender}:\n${msg.content}\n\n`;
    });
    
    return exportText;
  }
}

export const chatSessionManager = new ChatSessionManager();

// Initialize on load
chatSessionManager.loadFromStorage();
