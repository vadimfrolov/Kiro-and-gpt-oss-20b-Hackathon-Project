import { useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { TaskList, ChatContainer, CalendarIntegration } from './components'
import { ErrorBoundary } from './components/ErrorBoundary'
import { NotificationSystem } from './components/NotificationSystem'
import { 
  Task, 
  TaskCreate, 
  TaskUpdate, 
  Priority, 
  TaskStatus,
  ChatMessage,
  ChatPromptRequest,
  GeneratedTask,
  MessageRole
} from './types'
import { MessageSquare, CheckSquare, Calendar } from 'lucide-react'
import { useRealTimeSync } from './hooks/useRealTimeSync'
import { useOnlineStatus } from './stores/useOfflineStore'
import { useChatConversation, useChatMessages } from './hooks/useChat'
import { useNotify } from './components/NotificationSystem'
import './App.css'

// Mock data for demonstration
const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Complete project documentation',
    description: 'Write comprehensive documentation for the Ollama Todo App project',
    due_date: '2024-12-15T10:00:00.000Z',
    priority: Priority.HIGH,
    category: 'Work',
    status: TaskStatus.IN_PROGRESS,
    created_at: '2024-12-01T09:00:00.000Z',
    updated_at: '2024-12-01T09:00:00.000Z',
    ai_generated: false,
  },
  {
    id: 2,
    title: 'Buy groceries',
    description: 'Milk, bread, eggs, and vegetables for the week',
    due_date: '2024-12-10T18:00:00.000Z',
    priority: Priority.MEDIUM,
    category: 'Personal',
    status: TaskStatus.PENDING,
    created_at: '2024-12-01T08:30:00.000Z',
    updated_at: '2024-12-01T08:30:00.000Z',
    ai_generated: true,
  },
  {
    id: 3,
    title: 'Schedule dentist appointment',
    description: 'Call Dr. Smith\'s office to schedule routine cleaning',
    priority: Priority.LOW,
    category: 'Health',
    status: TaskStatus.COMPLETED,
    created_at: '2024-11-28T14:00:00.000Z',
    updated_at: '2024-12-01T10:00:00.000Z',
    ai_generated: false,
  },
]

const mockChatMessages: ChatMessage[] = [
  {
    id: 1,
    content: 'Plan a birthday party for my daughter next weekend',
    role: MessageRole.USER,
    timestamp: '2024-12-01T10:00:00.000Z',
  },
  {
    id: 2,
    content: 'I\'ll help you plan a birthday party! Here are some tasks to get you started:',
    role: MessageRole.ASSISTANT,
    timestamp: '2024-12-01T10:00:30.000Z',
    generated_tasks: [
      {
        title: 'Send invitations to guests',
        description: 'Create and send birthday party invitations to friends and family',
        suggested_due_date: '2024-12-05T18:00:00.000Z',
        suggested_priority: Priority.HIGH,
        suggested_category: 'Party Planning',
        confidence_score: 0.95,
      },
      {
        title: 'Order birthday cake',
        description: 'Choose and order a birthday cake from local bakery',
        suggested_due_date: '2024-12-06T12:00:00.000Z',
        suggested_priority: Priority.HIGH,
        suggested_category: 'Party Planning',
        confidence_score: 0.92,
      },
      {
        title: 'Buy decorations and party supplies',
        description: 'Purchase balloons, streamers, plates, cups, and other party decorations',
        suggested_due_date: '2024-12-07T15:00:00.000Z',
        suggested_priority: Priority.MEDIUM,
        suggested_category: 'Party Planning',
        confidence_score: 0.88,
      },
    ],
  },
]

type ViewMode = 'tasks' | 'chat';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('chat');
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [freshResponse, setFreshResponse] = useState<{ message: ChatMessage; tasks: GeneratedTask[] } | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  // Initialize real-time sync and online status
  const { isOnline } = useOnlineStatus();
  useRealTimeSync({
    enabled: true,
    interval: 30000, // 30 seconds
  });
  
  // Chat functionality
  const { sendPrompt, isGenerating, error: chatError } = useChatConversation();
  const { data: chatMessagesData, isLoading: chatLoading } = useChatMessages();
  const notify = useNotify();
  
  // Use real chat messages from the API, fallback to empty array
  const chatMessages = chatMessagesData?.items || [];
  
  // Add debug info about chat messages
  console.log('🔍 App chat messages debug:', {
    hasData: !!chatMessagesData,
    itemsLength: chatMessagesData?.items?.length || 0,
    finalMessagesLength: chatMessages.length,
    currentView,
    isLoading: chatLoading,
    isGenerating
  });
  
  // Debug logging
  console.log('💬 Chat messages data:', { 
    chatMessagesData, 
    items: chatMessagesData?.items, 
    isLoading: chatLoading,
    messagesCount: chatMessages.length,
    latestMessage: chatMessages[chatMessages.length - 1]
  });

  const handleCreateTask = (taskData: TaskCreate) => {
    console.log('Creating task:', taskData)
    // In real implementation, this would call the API
    const newTask: Task = {
      id: Date.now(),
      ...taskData,
      ai_generated: taskData.ai_generated || false,
      status: TaskStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
  }

  const handleUpdateTask = (id: number, updates: TaskUpdate) => {
    console.log('Updating task:', id, updates)
    setTasks(prev => prev.map(task => 
      task.id === id 
        ? { ...task, ...updates, updated_at: new Date().toISOString() }
        : task
    ));
  }

  const handleDeleteTask = (id: number) => {
    console.log('Deleting task:', id)
    setTasks(prev => prev.filter(task => task.id !== id));
  }

  const handleToggleComplete = (id: number) => {
    console.log('Toggling task completion:', id)
    setTasks(prev => prev.map(task => 
      task.id === id 
        ? { 
            ...task, 
            status: task.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED,
            updated_at: new Date().toISOString()
          }
        : task
    ));
  }

  const handleSendPrompt = async (prompt: ChatPromptRequest) => {
    console.log('📤 App: Sending prompt:', prompt);
    
    // Clear any previous fresh response
    setFreshResponse(null);
    
    try {
      // Use the chat hook to send the prompt to the API
      // The hook handles adding user messages and managing conversation state
      const response = await sendPrompt(prompt.prompt, prompt.context);
      
      console.log('📥 App: Received response:', response);
      
      // Store the fresh response for immediate display
      if (response.message && response.generated_tasks.length > 0) {
        setFreshResponse({
          message: response.message,
          tasks: response.generated_tasks
        });
        console.log('💾 App: Stored fresh response for immediate display');
      }
      
      if (response.generated_tasks.length > 0) {
        notify.success(
          'Tasks Generated!', 
          `I've created ${response.generated_tasks.length} tasks based on your request.`
        );
      }
      
      // The response is handled by the useChatConversation hook
      // No need to manually update chatMessages here
      
    } catch (error) {
      console.error('💥 App: Error generating tasks:', error);
      notify.error(
        'Failed to Generate Tasks',
        'There was an error connecting to the AI service. Please try again.'
      );
    } finally {
      console.log('🏁 App: handleSendPrompt completed');
    }
  }

  const handleAcceptTasks = (generatedTasks: GeneratedTask[]) => {
    console.log('Accepting tasks:', generatedTasks);
    
    const newTasks: Task[] = generatedTasks.map(task => ({
      id: Date.now() + Math.random(),
      title: task.title,
      description: task.description,
      due_date: task.suggested_due_date,
      priority: task.suggested_priority,
      category: task.suggested_category,
      status: TaskStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_generated: true,
    }));
    
    setTasks(prev => [...newTasks, ...prev]);
    
    // Clear fresh response after accepting tasks
    setFreshResponse(null);
  }

  const handleRejectTasks = () => {
    console.log('Rejecting tasks');
    // Clear fresh response after rejecting tasks
    setFreshResponse(null);
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900">Ollama Todo App</h1>
                  
                  {/* Online/Offline Status Indicator */}
                  <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium ${
                    isOnline 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Calendar Integration Button */}
                  <button
                    onClick={() => setShowCalendarModal(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <Calendar size={16} />
                    <span>Calendar</span>
                  </button>

                  {/* View Toggle */}
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setCurrentView('tasks')}
                      className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 transition-colors ${
                        currentView === 'tasks'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <CheckSquare size={16} />
                      <span>Tasks</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('chat')}
                      className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 transition-colors border-l border-gray-300 ${
                        currentView === 'chat'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare size={16} />
                      <span>AI Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          <main className="container mx-auto px-4 py-8">
            {currentView === 'tasks' ? (
              <TaskList
                tasks={tasks}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ) : (
              <div className="h-[calc(100vh-200px)]">
                <ChatContainer
                  messages={chatMessages}
                  onSendPrompt={handleSendPrompt}
                  onAcceptTasks={handleAcceptTasks}
                  onRejectTasks={handleRejectTasks}
                  isLoading={isGenerating || chatLoading}
                  error={chatError?.message || null}
                  freshResponse={freshResponse}
                />
              </div>
            )}
          </main>
        </div>
        
        {/* Global Notification System */}
        <NotificationSystem />
        
        {/* Calendar Integration Modal */}
        <CalendarIntegration 
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
        />
      </Router>
    </ErrorBoundary>
  )
}

export default App