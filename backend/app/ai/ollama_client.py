import logging
import httpx
from typing import Dict, Any

from app.config import OLLAMA_MODEL, OLLAMA_BASE_URL

logger = logging.getLogger("codeatlas.ai.ollama_client")


class OllamaClient:
    """
    HTTP client for querying a local Ollama daemon.
    Uses a single, persistent HTTPX client connection instance.
    """

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(OllamaClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, base_url: str = OLLAMA_BASE_URL, default_model: str = OLLAMA_MODEL):
        """
        Initializes the Ollama HTTP client with persistent session configurations.
        """
        if self._initialized:
            return

        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        # Use a persistent HTTPX client for connection pooling
        self.client = httpx.Client(timeout=60.0)
        self._initialized = True
        logger.info(f"OllamaClient initialized. Host: {self.base_url}, Default Model: {self.default_model}")

    def is_healthy(self) -> bool:
        """
        Checks if the local Ollama service is running and accessible.
        """
        try:
            resp = self.client.get(f"{self.base_url}/")
            return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            return False

    def generate(self, prompt: str, model: str | None = None) -> str:
        """
        Sends a text prompt to the Ollama '/api/generate' endpoint.

        Args:
            prompt (str): The structured prompt.
            model (str, optional): The target LLM model. Falls back to default.

        Returns:
            str: Generated response text.
        """
        target_model = model or self.default_model
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": False
        }

        logger.info(f"Sending generation request to Ollama using model '{target_model}'...")
        try:
            resp = self.client.post(url, json=payload)
            if resp.status_code != 200:
                logger.error(f"Ollama returned error status: {resp.status_code}. Response: {resp.text}")
                return f"Error: Local Ollama service returned status code {resp.status_code}."

            data = resp.json()
            response_text = data.get("response", "")
            logger.info("Ollama response generated successfully.")
            return response_text

        except Exception as e:
            logger.exception(f"HTTP request to Ollama daemon failed: {e}")
            return f"Error: Could not connect to local Ollama daemon at {self.base_url}. Ensure Ollama is running."


# Global client instance
_ollama_instance = None


def get_ollama_client(base_url: str = OLLAMA_BASE_URL, default_model: str = OLLAMA_MODEL) -> OllamaClient:
    """
    Returns the singleton instance of the OllamaClient.
    """
    global _ollama_instance
    if _ollama_instance is None:
        _ollama_instance = OllamaClient(base_url=base_url, default_model=default_model)
    return _ollama_instance
