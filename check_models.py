# # check_models.py
# import google.generativeai as genai
# import os
# from dotenv import load_dotenv

# load_dotenv()

# api_key = os.getenv("GOOGLE_API_KEY")

# if not api_key:
#     print("Error: GOOGLE_API_KEY not found in .env")
# else:
#     genai.configure(api_key=api_key)
#     print("Available Google Models for your key:")
#     try:
#         for m in genai.list_models():
#             if 'generateContent' in m.supported_generation_methods:
#                 print(f"- {m.name}")
#     except Exception as e:
#         print(f"Error: {e}")

from openai import OpenAI

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = "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"
)

completion = client.chat.completions.create(
  model="deepseek-ai/deepseek-v3.1-terminus",
  messages=[{"role":"user","content":"Please explain about"}],
  temperature=0.2,
  top_p=0.7,
  max_tokens=8192,
  extra_body={"chat_template_kwargs": {"thinking":True}},
  stream=True
)

for chunk in completion:
  reasoning = getattr(chunk.choices[0].delta, "reasoning_content", None)
  if reasoning:
    print(reasoning, end="")
  if chunk.choices[0].delta.content is not None:
    print(chunk.choices[0].delta.content, end="")