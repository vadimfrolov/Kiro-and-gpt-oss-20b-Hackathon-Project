#!/usr/bin/env python3
"""
Test script to verify Ollama connection and functionality.
"""
import asyncio
import sys
import os

# Add the backend directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(__file__))

from app.services.ollama_service import OllamaAIService


async def test_ollama_connection():
    """Test Ollama connection and basic functionality."""
    print("🔍 Testing Ollama connection...")
    
    # Create service instance
    service = OllamaAIService()
    
    # Test 1: Check connection
    print("\n1. Testing connection health check...")
    try:
        is_healthy = await service.check_connection(force_check=True)
        if is_healthy:
            print("✅ Ollama connection is healthy!")
            print(f"   Using model: {service.model}")
        else:
            print("❌ Ollama connection failed")
            return False
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False
    
    # Test 2: List available models
    print("\n2. Getting available models...")
    try:
        models = await service.get_available_models()
        print(f"✅ Available models: {models}")
    except Exception as e:
        print(f"❌ Failed to get models: {e}")
        return False
    
    # Test 3: Test task generation
    print("\n3. Testing task generation from prompt...")
    try:
        prompt = "I need to prepare for a job interview next week and also buy groceries for dinner tonight"
        print(f"   Prompt: '{prompt}'")
        
        tasks = await service.generate_tasks_from_prompt(prompt)
        
        if tasks:
            print(f"✅ Generated {len(tasks)} tasks:")
            for i, task in enumerate(tasks, 1):
                print(f"   {i}. {task.title}")
                print(f"      Description: {task.description}")
                print(f"      Priority: {task.suggested_priority}")
                print(f"      Category: {task.suggested_category}")
                print(f"      Confidence: {task.confidence_score:.2f}")
                if task.suggested_due_date:
                    print(f"      Due Date: {task.suggested_due_date}")
                print()
        else:
            print("⚠️  No tasks generated")
            
    except Exception as e:
        print(f"❌ Task generation failed: {e}")
        return False
    
    # Test 4: Test task categorization
    print("4. Testing task categorization...")
    try:
        task_desc = "Schedule dentist appointment for next month"
        category = await service.categorize_task(task_desc)
        print(f"✅ Task: '{task_desc}'")
        print(f"   Suggested category: {category}")
    except Exception as e:
        print(f"❌ Task categorization failed: {e}")
        return False
    
    # Test 5: Test priority suggestion
    print("\n5. Testing priority suggestion...")
    try:
        task_desc = "Fix critical production bug affecting all users"
        priority = await service.suggest_priority(task_desc)
        print(f"✅ Task: '{task_desc}'")
        print(f"   Suggested priority: {priority}")
    except Exception as e:
        print(f"❌ Priority suggestion failed: {e}")
        return False
    
    # Test 6: Test task description improvement
    print("\n6. Testing task description improvement...")
    try:
        original_desc = "Update report"
        improved_desc = await service.improve_task_description(original_desc)
        print(f"✅ Original: '{original_desc}'")
        print(f"   Improved: '{improved_desc}'")
    except Exception as e:
        print(f"❌ Task improvement failed: {e}")
        return False
    
    print("\n🎉 All tests passed! Ollama integration is working correctly.")
    return True


if __name__ == "__main__":
    print("Ollama Connection Test")
    print("=" * 50)
    
    try:
        success = asyncio.run(test_ollama_connection())
        if success:
            print("\n✅ Ollama service is ready for use!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed. Check Ollama installation and configuration.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)