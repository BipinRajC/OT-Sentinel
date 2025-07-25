#!/bin/bash
echo "🔍 GPU Information:"
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi
else
    echo "nvidia-smi not available in container"
fi
echo -e "\n🐍 Python GPU Libraries:"
python -c "import torch; print(f\"PyTorch CUDA Available: {torch.cuda.is_available()}\")" || echo "PyTorch not available"
