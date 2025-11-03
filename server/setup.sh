#!/bin/bash

# League of Legends Match Tracker - Setup Script

set -e

echo "🚀 Setting up LoL Match Tracker Backend..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env .env.backup 2>/dev/null || true
    echo "⚠️  Please update the RIOT_API_KEY in .env file with your actual API key"
else
    echo "✅ .env file already exists"
fi

# Download Go dependencies
echo "📦 Downloading Go dependencies..."
go mod download
go mod tidy

# Build the application
echo "🔨 Building the application..."
go build -o server cmd/server/main.go

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update your Riot API key in .env file:"
echo "   RIOT_API_KEY=your_actual_riot_api_key_here"
echo ""
echo "2. Start the database services:"
echo "   make db-up"
echo ""
echo "3. Run the API server:"
echo "   make run"
echo ""
echo "4. Or run everything with Docker:"
echo "   make docker-run"
echo ""
echo "📖 For more information, check the README.md file"