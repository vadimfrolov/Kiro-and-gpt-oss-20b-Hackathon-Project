import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, ChatPromptRequest, GeneratedTask } from "../../types";
import { MessageRole } from "../../types/enums";
import { PromptInput } from "./PromptInput";
import { TaskPreview } from "./TaskPreview";
import { format } from "date-fns";
import {
  Bot,
  User,
  MessageSquare,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ChatContainerProps {
  messages: ChatMessage[];
  onSendPrompt: (prompt: ChatPromptRequest) => void;
  onAcceptTasks: (tasks: GeneratedTask[]) => void;
  onRejectTasks?: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void;
  freshResponse?: { message: ChatMessage; tasks: GeneratedTask[] } | null;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendPrompt,
  onAcceptTasks,
  onRejectTasks,
  isLoading = false,
  error = null,
  onRetry,
  freshResponse = null,
}) => {

  const [pendingTasks, setPendingTasks] = useState<GeneratedTask[] | null>(
    null
  );
  const [rejectedMessageIds, setRejectedMessageIds] = useState<Set<number>>(
    new Set()
  );
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<
    number | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Detect new messages with tasks and reset handled state
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (
      latestMessage &&
      latestMessage.role === MessageRole.ASSISTANT &&
      latestMessage.generated_tasks &&
      latestMessage.generated_tasks.length > 0 &&
      !rejectedMessageIds.has(latestMessage.id)
    ) {
      console.log("🆕 Message with tasks detected:", {
        messageId: latestMessage.id,
        previousProcessedId: lastProcessedMessageId,
        tasksCount: latestMessage.generated_tasks.length,
        isAlreadyRejected: rejectedMessageIds.has(latestMessage.id),
      });

      // Update the processed message ID if this is a different message
      if (latestMessage.id !== lastProcessedMessageId) {
        setPendingTasks(null);
        setLastProcessedMessageId(latestMessage.id);
      }
    }
  }, [messages, lastProcessedMessageId, rejectedMessageIds]);

  const handlePromptSubmit = (prompt: ChatPromptRequest) => {
    console.log("📤 Submitting new prompt, resetting state");
    setPendingTasks(null);
    // Clear rejected messages when sending a new prompt
    setRejectedMessageIds(new Set());
    setLastProcessedMessageId(null);
    onSendPrompt(prompt);
  };

  const handleAcceptTasks = (tasks: GeneratedTask[]) => {
    console.log("✅ Accepting tasks:", tasks.length);
    onAcceptTasks(tasks);
    setPendingTasks(null);
    // Mark the message as handled (accepted)
    if (lastProcessedMessageId) {
      setRejectedMessageIds((prev) =>
        new Set(prev).add(lastProcessedMessageId)
      );
      console.log("📝 Marked message as accepted:", lastProcessedMessageId);
      // Clear the processed message ID to prevent showing preview again
      setLastProcessedMessageId(null);
    }
  };

  const handleAcceptSelected = (tasks: GeneratedTask[]) => {
    console.log("✅ Accepting selected tasks:", tasks.length);
    onAcceptTasks(tasks);
    setPendingTasks(null);
    // Mark the message as handled (accepted)
    if (lastProcessedMessageId) {
      setRejectedMessageIds((prev) =>
        new Set(prev).add(lastProcessedMessageId)
      );
      console.log("📝 Marked message as accepted:", lastProcessedMessageId);
      // Clear the processed message ID to prevent showing preview again
      setLastProcessedMessageId(null);
    }
  };

  const handleRejectTasks = () => {
    console.log("❌ Rejecting tasks");
    setPendingTasks(null);
    // Mark the message as rejected
    if (lastProcessedMessageId) {
      setRejectedMessageIds((prev) =>
        new Set(prev).add(lastProcessedMessageId)
      );
      console.log("📝 Marked message as rejected:", lastProcessedMessageId);
      // Clear the processed message ID to prevent showing preview again
      setLastProcessedMessageId(null);
    }
    
    // Call parent reject handler to clear fresh response
    if (onRejectTasks) {
      onRejectTasks();
    }
  };

  // Prioritize fresh response over cached messages
  const latestMessage = messages[messages.length - 1];
  
  // Use fresh response if available, otherwise fall back to cached message
  const tasksToShow = freshResponse?.tasks || latestMessage?.generated_tasks;
  const messageToCheck = freshResponse?.message || latestMessage;
  
  // Break down the conditions for debugging
  const hasMessage = !!messageToCheck;
  const isAssistantMessage = messageToCheck?.role === MessageRole.ASSISTANT;
  const hasGeneratedTasks = !!(tasksToShow && tasksToShow.length > 0);
  const noPendingTasks = !pendingTasks;
  const notRejected = messageToCheck?.id ? !rejectedMessageIds.has(messageToCheck.id) : true; // Allow fresh responses
  const hasFreshResponse = !!freshResponse;
  
  // Show preview if we have fresh response OR latest cached message with tasks that hasn't been rejected
  const showTaskPreview = hasMessage && isAssistantMessage && hasGeneratedTasks && noPendingTasks && (hasFreshResponse || notRejected);
  


  // Debug logging
  console.log("🔍 Task preview debug:", {
    latestMessageId: latestMessage?.id,
    freshResponseMessageId: freshResponse?.message?.id,
    lastProcessedMessageId,
    hasGeneratedTasks: !!tasksToShow?.length,
    generatedTasksCount: tasksToShow?.length || 0,
    cachedTasksCount: latestMessage?.generated_tasks?.length || 0,
    isRejected: messageToCheck?.id
      ? rejectedMessageIds.has(messageToCheck.id)
      : false,
    showTaskPreview,
    hasFreshResponse,
    rejectedMessageIds: Array.from(rejectedMessageIds),
    messagesCount: messages.length,
    latestMessageRole: latestMessage?.role,
    latestMessageContent: latestMessage?.content?.substring(0, 50) + "...",
    pendingTasks: !!pendingTasks,
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">


      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <MessageSquare size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            AI Task Assistant
          </h2>
        </div>
        <div className="text-sm text-gray-500">{messages.length} messages</div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to AI Task Assistant
            </h3>
            <p className="text-gray-600 max-w-md">
              Describe what you need to do in natural language, and I'll help
              you break it down into actionable tasks with priorities and
              deadlines.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <p className="mb-1">Try asking:</p>
              <ul className="text-left space-y-1">
                <li>• "Plan a birthday party for next weekend"</li>
                <li>• "Organize my work project for Q1"</li>
                <li>• "Prepare for my vacation next month"</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === MessageRole.USER
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === MessageRole.USER
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-1">
                      {message.role === MessageRole.USER ? (
                        <User size={16} />
                      ) : (
                        <Bot size={16} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <div
                        className={`text-xs mt-2 ${
                          message.role === MessageRole.USER
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {format(new Date(message.timestamp), "h:mm a")}
                        {message.generated_tasks &&
                          message.generated_tasks.length > 0 && (
                            <span className="ml-2">
                              • {message.generated_tasks.length} tasks generated
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Bot size={16} className="text-gray-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-md">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center space-x-1"
                    >
                      <RefreshCw size={12} />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>



      {/* Debug Task Preview Status */}
      {/* <div className="bg-blue-100 p-2 text-xs text-blue-800 flex justify-between items-center">
        <span>
          🔍 TaskPreview Debug: showTaskPreview={showTaskPreview ? 'YES' : 'NO'} | 
          hasMessage={hasMessage ? 'YES' : 'NO'} |
          isAssistantMessage={isAssistantMessage ? 'YES' : 'NO'} |
          hasGeneratedTasks={hasGeneratedTasks ? 'YES' : 'NO'} |
          noPendingTasks={noPendingTasks ? 'YES' : 'NO'} |
          notRejected={notRejected ? 'YES' : 'NO'} |
          hasFreshResponse={hasFreshResponse ? 'YES' : 'NO'} |
          latestMsg={latestMessage?.id} | 
          freshMsg={freshResponse?.message?.id} |
          tasksCount={tasksToShow?.length || 0}
        </span>
        <button 
          onClick={() => window.location.reload()} 
          className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs ml-2"
        >
          🔄 Refresh
        </button>
      </div> */}

      {/* Task Preview */}
      {showTaskPreview && tasksToShow && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-purple-100 p-2 mb-2 text-xs text-purple-800">
            🎉 Showing TaskPreview with {tasksToShow.length} tasks {hasFreshResponse ? '(FRESH)' : '(CACHED)'}
          </div>
          <TaskPreview
            tasks={tasksToShow}
            onAcceptTasks={handleAcceptTasks}
            onRejectTasks={handleRejectTasks}
            onAcceptSelected={handleAcceptSelected}
          />
        </div>
      )}

      {/* Pending Task Preview */}
      {pendingTasks && (
        <div className="p-4 border-t border-gray-200">
          <TaskPreview
            tasks={pendingTasks}
            onAcceptTasks={handleAcceptTasks}
            onRejectTasks={handleRejectTasks}
            onAcceptSelected={handleAcceptSelected}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <PromptInput onSubmit={handlePromptSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
};
