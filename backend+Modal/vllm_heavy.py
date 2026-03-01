import modal
"""
vllm_image = (
    modal.Image.from_registry("nvidia/cuda:12.8.0-devel-ubuntu22.04", add_python="3.12")
    .entrypoint([])
    .apt_install("git")
    .uv_pip_install(
        "vllm==0.13.0",
        "transformers>=4.57.5",   # ✅ add this
        "huggingface-hub==0.36.0",
        "accelerate",
        "safetensors",
        "certifi",
    )
    .run_commands(
        "python -m pip install -U git+https://github.com/huggingface/transformers.git"
    )
    .env({"HF_XET_HIGH_PERFORMANCE": "1"})
)

"""
vllm_image = (
    modal.Image.from_registry("nvidia/cuda:12.8.0-devel-ubuntu22.04", add_python="3.12")
    .entrypoint([])
    .uv_pip_install(
        "vllm==0.16.0",
        "huggingface-hub==0.36.0",
        "accelerate",
        "safetensors",
        "certifi",
    )
    .env({"HF_XET_HIGH_PERFORMANCE": "1"})
)



MODEL_NAME = "Qwen/Qwen3-32B"#"Qwen/Qwen3-VL-8B-Instruct" #"Qwen/Qwen2.5-7B-Instruct"
MODEL_REVISION = None  # set to a commit hash if you want to pin

hf_cache_vol = modal.Volume.from_name("huggingface-cache", create_if_missing=True)
vllm_cache_vol = modal.Volume.from_name("vllm-cache", create_if_missing=True)

FAST_BOOT = True
app = modal.App("example-vllm-inference")

N_GPU = 8
MINUTES = 60
VLLM_PORT = 8000


@app.function(
    image=vllm_image,
    gpu=f"H200:{N_GPU}",
    min_containers=1,
    scaledown_window=15 * MINUTES,
    timeout=10 * MINUTES,
    volumes={
        "/root/.cache/huggingface": hf_cache_vol,
        "/root/.cache/vllm": vllm_cache_vol,
    },
)
@modal.concurrent(max_inputs=32)
@modal.web_server(port=VLLM_PORT, startup_timeout=10 * MINUTES)
def serve():
    import subprocess

    cmd = [
        "vllm",
        "serve",
        "--uvicorn-log-level=info",
        MODEL_NAME,
        "--served-model-name",
        MODEL_NAME,
        "--host",
        "0.0.0.0",
        "--port",
        str(VLLM_PORT),

        # ✅ key fix for Qwen2.5 Instruct
        "--trust-remote-code",
    ]
    cmd += ["--tensor-parallel-size", str(N_GPU)]

    # ✅ only include revision if you actually set one
    if MODEL_REVISION:
        cmd += ["--revision", MODEL_REVISION]


    # assume multiple GPUs are for splitting up large matrix multiplications
    cmd += ["--tensor-parallel-size", str(N_GPU)]

    # If it STILL fails, uncomment these to force the safer HF Transformers path:
    # cmd += ["--model-impl", "transformers"]
    # cmd += ["--task", "generate"]

    print(*cmd)
    subprocess.Popen(" ".join(cmd), shell=True)