"""
LLM Provider Abstraction Layer
Supports multiple LLM backends: Groq (default), Gemini, OpenAI (future)
"""

import os
from abc import ABC, abstractmethod
from typing import Generator, Optional

# Groq imports
from groq import Groq

# Gemini imports (fallback)
import google.generativeai as genai


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    def generate(self, prompt: str, max_tokens: int = 4096) -> str:
        """Generate a response from the LLM"""
        pass
    
    @abstractmethod
    def generate_stream(self, prompt: str, max_tokens: int = 4096) -> Generator[str, None, None]:
        """Generate a streaming response from the LLM"""
        pass


class GroqProvider(LLMProvider):
    """Groq LLM Provider - Uses LLaMA 3.3 70B by default"""
    
    # Available models on Groq (as of Dec 2024)
    MODELS = {
        "llama-3.3-70b": "llama-3.3-70b-versatile",      # Best for general tasks
        "llama-4-scout": "meta-llama/llama-4-scout-17b-16e-instruct",  # Multimodal
        "kimi-k2": "moonshotai/kimi-k2-instruct",        # Good for reasoning
        "qwen-32b": "qwen/qwen3-32b",                    # Alternative
        "mixtral": "mixtral-8x7b-32768",                 # Fast, good quality
    }
    
    def __init__(self, model_key: str = "llama-3.3-70b"):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.client = Groq(api_key=api_key)
        self.model = self.MODELS.get(model_key, self.MODELS["llama-3.3-70b"])
        print(f"[LLM] Initialized Groq provider with model: {self.model}")
    
    def generate(self, prompt: str, max_tokens: int = 4096) -> str:
        """Generate a response using Groq"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful educational AI tutor."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[LLM] Groq error: {e}")
            raise
    
    def generate_stream(self, prompt: str, max_tokens: int = 4096) -> Generator[str, None, None]:
        """Generate a streaming response using Groq"""
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful educational AI tutor."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            print(f"[LLM] Groq streaming error: {e}")
            raise


class GeminiProvider(LLMProvider):
    """Gemini LLM Provider - Fallback option"""
    
    def __init__(self, model_name: str = "gemini-2.5-flash-preview-05-20"):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        print(f"[LLM] Initialized Gemini provider with model: {model_name}")
    
    def generate(self, prompt: str, max_tokens: int = 4096) -> str:
        """Generate a response using Gemini"""
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"[LLM] Gemini error: {e}")
            raise
    
    def generate_stream(self, prompt: str, max_tokens: int = 4096) -> Generator[str, None, None]:
        """Generate a streaming response using Gemini"""
        try:
            response_stream = self.model.generate_content(prompt, stream=True)
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"[LLM] Gemini streaming error: {e}")
            raise


# Factory function to get the appropriate provider
def get_llm_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """
    Get an LLM provider instance.
    
    Priority:
    1. Explicit provider_name argument
    2. LLM_PROVIDER environment variable
    3. Default to Groq if GROQ_API_KEY exists, else Gemini
    """
    if provider_name is None:
        provider_name = os.environ.get("LLM_PROVIDER", "auto")
    
    provider_name = provider_name.lower()
    
    if provider_name == "auto":
        # Auto-detect based on available API keys
        if os.environ.get("GROQ_API_KEY"):
            provider_name = "groq"
        elif os.environ.get("GEMINI_API_KEY"):
            provider_name = "gemini"
        else:
            raise ValueError("No LLM API key found. Set GROQ_API_KEY or GEMINI_API_KEY.")
    
    if provider_name == "groq":
        model = os.environ.get("GROQ_MODEL", "llama-3.3-70b")
        return GroqProvider(model_key=model)
    elif provider_name == "gemini":
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown LLM provider: {provider_name}")


# Global provider instance (lazy initialization)
_llm_provider: Optional[LLMProvider] = None

def get_provider() -> LLMProvider:
    """Get or create the global LLM provider instance"""
    global _llm_provider
    if _llm_provider is None:
        _llm_provider = get_llm_provider()
    return _llm_provider
