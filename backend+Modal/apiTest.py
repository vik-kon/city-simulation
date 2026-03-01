import requests
import time

payload = {
    "prompt":"what is the effect of a 20% tarrif on new yorkers",
    "numnum_workers": 5
}
response = requests.post("http://127.0.0.1:8000/api/v1/run", json=payload)
print("Status:", response.status_code)
print("JSON:", response.json())

data = response.json()
print(data)
