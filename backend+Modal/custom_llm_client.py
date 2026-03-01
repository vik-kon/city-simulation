import os
from openai import OpenAI

def callLLM(prompt, system_prompt = None, max_tokens=30000, temperature = 0.7, type="heavy",model=None, stream=False):
    if type=="heavy":
        BASE_URL = "https://aadiken--example-vllm-inference-serve-dev.modal.run/v1"
    else:
        BASE_URL = "https://aadiken--light-vllm-inference-serve-dev.modal.run/v1"
    API_KEY = os.getenv("MODAL_API_KEY")

    MODEL = model 

    MAX_TOKENS = max_tokens
    TEMPERATURE = temperature
    TOP_P = 0.9
    FREQUENCY_PENALTY = 0
    PRESENCE_PENALTY = 0
    STREAM = stream

    SYSTEM_PROMPT = ""
    CHAT_MODE = False
    client = OpenAI(api_key=API_KEY,base_url=BASE_URL)
    if MODEL:
        model_id = MODEL
        print(f"Using model: {model_id}")
    else:
        print("Looking up available models")
        model = client.models.list().data[0]
        model_id = model.id
        print(f"Using: {model_id}")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    messages.append({"role": "user", "content": prompt})
    response = client.chat.completions.create(
        model=model_id,
        messages=messages,
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
        top_p=TOP_P,
        frequency_penalty=FREQUENCY_PENALTY,
        presence_penalty=PRESENCE_PENALTY,
        stream=STREAM,
    )
    if STREAM:
        print("\n🤖:", end="")
        for chunk in response:
            if chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end="")
        print()
    else:
        return response.choices[0].message.content

