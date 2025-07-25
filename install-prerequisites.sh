#!/bin/bash

# OT Security System - Prerequisites Installation
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BOLD}${BLUE}$1${NC}"
    echo "=========================="
}

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header "🚀 Installing Prerequisites for OT Security System"

# Check if running as non-root
if [ "$EUID" -eq 0 ]; then
    print_error "Please run this script as a regular user (not root)"
    exit 1
fi

print_info "Updating package lists..."
sudo pacman -Sy

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_info "Installing Docker..."
    sudo pacman -S --noconfirm docker docker-compose
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    print_status "Docker installed"
else
    print_status "Docker already installed"
fi

# Install NVIDIA Container Toolkit
print_info "Installing NVIDIA Container Toolkit..."

# Add NVIDIA repository for Arch Linux
if [ ! -f "/etc/pacman.d/nvidia-container-toolkit.list" ]; then
    # For Arch Linux, install from AUR or compile from source
    if command -v yay &> /dev/null; then
        yay -S --noconfirm nvidia-container-toolkit
    elif command -v paru &> /dev/null; then
        paru -S --noconfirm nvidia-container-toolkit
    else
        print_warning "AUR helper not found. Installing nvidia-container-toolkit manually..."
        
        # Install from GitHub releases
        cd /tmp
        wget https://github.com/NVIDIA/nvidia-container-toolkit/releases/download/v1.15.0/nvidia-container-toolkit_1.15.0_linux_amd64.tar.gz
        tar -xzf nvidia-container-toolkit_1.15.0_linux_amd64.tar.gz
        sudo cp nvidia-container-toolkit/usr/bin/* /usr/local/bin/
        sudo cp nvidia-container-toolkit/etc/nvidia-container-runtime/config.toml /etc/nvidia-container-runtime/
    fi
fi

# Configure Docker for NVIDIA runtime
print_info "Configuring Docker for GPU support..."
sudo mkdir -p /etc/docker

# Create or update Docker daemon configuration
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    },
    "default-runtime": "nvidia"
}
EOF

# Restart Docker
print_info "Restarting Docker service..."
sudo systemctl restart docker

# Install Python and pip if needed
if ! command -v python3 &> /dev/null; then
    print_info "Installing Python..."
    sudo pacman -S --noconfirm python python-pip
    print_status "Python installed"
fi

# Install curl if needed
if ! command -v curl &> /dev/null; then
    print_info "Installing curl..."
    sudo pacman -S --noconfirm curl
    print_status "curl installed"
fi

print_header "🔧 Setting up Docker environment"

# Set correct Docker socket
export DOCKER_HOST=unix:///var/run/docker.sock

# Add to shell profile for persistence
if ! grep -q "DOCKER_HOST" ~/.bashrc 2>/dev/null; then
    echo 'export DOCKER_HOST=unix:///var/run/docker.sock' >> ~/.bashrc
fi

if ! grep -q "DOCKER_HOST" ~/.zshrc 2>/dev/null; then
    echo 'export DOCKER_HOST=unix:///var/run/docker.sock' >> ~/.zshrc
fi

# For fish shell
if [ -d ~/.config/fish ]; then
    if ! grep -q "DOCKER_HOST" ~/.config/fish/config.fish 2>/dev/null; then
        echo 'set -gx DOCKER_HOST unix:///var/run/docker.sock' >> ~/.config/fish/config.fish
    fi
fi

print_header "🧪 Testing Installation"

# Test Docker
print_info "Testing Docker..."
if docker run --rm hello-world > /dev/null 2>&1; then
    print_status "Docker is working"
else
    print_error "Docker test failed"
    print_info "You may need to log out and log back in for group changes to take effect"
fi

# Test GPU access
print_info "Testing GPU access..."
if docker run --rm --gpus all nvidia/cuda:12.4-base-ubuntu22.04 nvidia-smi > /dev/null 2>&1; then
    print_status "GPU access in Docker is working"
else
    print_warning "GPU test failed. This might work after a reboot."
    print_info "If problems persist, manually run: sudo nvidia-ctk runtime configure --runtime=docker"
fi

print_header "✅ Prerequisites Installation Complete"
echo
print_status "All prerequisites installed successfully!"
echo
echo -e "${BOLD}Next Steps:${NC}"
echo "1. Log out and log back in (or reboot) to apply group changes"
echo "2. Run the main setup script: ./setup-gpu.sh"
echo
echo -e "${BOLD}If you encounter issues:${NC}"
echo "• Reboot your system to ensure all changes take effect"
echo "• Check Docker status: sudo systemctl status docker"
echo "• Test GPU: docker run --rm --gpus all nvidia/cuda:12.4-base-ubuntu22.04 nvidia-smi" 