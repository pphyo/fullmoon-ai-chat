import os
import google.generativeai as genai
from openai import OpenAI
from abc import ABC, abstractmethod
from dotenv import load_dotenv

load_dotenv()

class LLMProvider(ABC):
    @abstractmethod
    def generate_response(self, model_id: str, messages: list) -> str:
        pass

class GoogleProvider(LLMProvider):
    def __init__(self):
        if os.getenv("GOOGLE_API_KEY"):
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

    def generate_response(self, model_id: str, messages: list) -> str:
        real_model_name = model_id.split(":", 1)[1]
        model = genai.GenerativeModel(real_model_name)

        chat_history = []
        last_user_msg = ""

        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            content = msg["content"]

            if msg["role"] == "system":
                continue

            if msg != messages[-1]:
                chat_history.append({"role": role, "parts": [content]})
            else:
                last_user_msg = content

        chat = model.start_chat(history=chat_history)
        response = chat.send_message(last_user_msg)
        return response.text

class NvidiaProvider(LLMProvider):
    def __init__(self):
        self.client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.getenv("NVIDIA_API_KEY")
        )

        self.model_configs = {
            "moonshotai/kimi-k2-instruct": {
                "temperature": 0.6,
                "top_p": 0.9,
                "max_tokens": 4096
            },
            "deepseek-ai/deepseek-v3.1": {
                "temperature": 0.2,
                "top_p": 0.7,
                "max_tokens": 8192,
                "extra_body": {"chat_template_kwargs": {"thinking": True}}
            },
            "meta/llama-3.1-8b-instruct": {
                "temperature": 0.2,
                "top_p": 0.7,
                "max_tokens": 1024
            }
        }

    def generate_response(self, model_id: str, messages: list) -> str:
        real_model_name = model_id.split("nvidia:", 1)[1]

        config = self.model_configs.get(real_model_name, {})

        completion = self.client.chat.completions.create(
            model=real_model_name,
            messages=messages,
            stream=False,
            **config
        )

        return completion.choices[0].message.content

class DefaultAISuiteProvider(LLMProvider):
    def generate_response(self, model_id: str, messages: list) -> str:
        response = self.client.chat.completions.create(
            model=model_id,
            messages=messages,
            temperature=0.7
        )
        return response.choices[0].message.content

class LLMFactory:
    def __init__(self):
        self._providers = {}
        self.register_provider("google", GoogleProvider())
        self.register_provider("nvidia", NvidiaProvider())
        self.default_provider = DefaultAISuiteProvider()

    def register_provider(self, prefix: str, provider: LLMProvider):
        self._providers[prefix] = provider

    def get_provider(self, model_id: str) -> LLMProvider:
        if ":" in model_id:
            prefix = model_id.split(":")[0]
            return self._providers.get(prefix, self.default_provider)
        return self.default_provider

factory = LLMFactory()

def get_ai_response(model_id, messages):
    try:
        provider = factory.get_provider(model_id)

        return provider.generate_response(model_id, messages)

    except Exception as e:
        print(f"Error in AI Service: {e}")
        return f"Sorry, I encountered an error: {str(e)}"