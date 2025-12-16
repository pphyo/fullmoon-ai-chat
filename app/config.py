from dotenv import load_dotenv

load_dotenv()

class Config:
    AVAILABLE_MODELS = [
        {"id": "google:gemini-2.5-flash", "name": "Google Gemini Flash"},
        {"id": "nvidia:moonshotai/kimi-k2-instruct", "name": "Kimi K2"},
        {"id": "nvidia:meta/llama-3.1-8b-instruct", "name": "Meta Llama"},
        {"id": "nvidia:deepseek-ai/deepseek-v3.1", "name": "Deepseek"}
    ]