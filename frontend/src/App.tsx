import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router } from 'react-router-dom'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">Ollama Todo App</h1>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h2 className="text-xl mb-4">Welcome to your AI-powered Todo List</h2>
              <p className="text-muted-foreground">
                Project structure is ready. Components will be implemented in upcoming tasks.
              </p>
            </div>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App