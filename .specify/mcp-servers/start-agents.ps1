# Multi-Agent Orchestrator Startup Script for Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Multi-Agent Orchestrator System" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.agents" ".env"
    Write-Host "Please edit .env file and add your YouTrack API token!" -ForegroundColor Red
    Write-Host ""
}

# Function to start a server in a new window
function Start-MCPServer {
    param(
        [string]$Name,
        [string]$Script,
        [string]$Port
    )
    
    Write-Host "Starting $Name on port $Port..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {
        Write-Host '===== $Name Server (Port: $Port) =====' -ForegroundColor Cyan
        node '$Script'
    }"
}

# Menu
Write-Host "Select startup option:" -ForegroundColor Cyan
Write-Host "[1] Start ALL servers (Orchestrator + YouTrack + Web MCP)" -ForegroundColor White
Write-Host "[2] Start Orchestrator only (Port 4300)" -ForegroundColor White
Write-Host "[3] Start YouTrack MCP only (Port 5180)" -ForegroundColor White
Write-Host "[4] Start Web MCP only (Port 4200)" -ForegroundColor White
Write-Host "[5] Start Orchestrator + YouTrack" -ForegroundColor White
Write-Host "[6] Start Orchestrator + Web MCP" -ForegroundColor White
Write-Host "[0] Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (0-6)"

switch ($choice) {
    "1" {
        Write-Host "Starting all servers..." -ForegroundColor Green
        Start-MCPServer -Name "Orchestrator" -Script "multi-agent-orchestrator.js" -Port "4300"
        Start-Sleep -Seconds 2
        Start-MCPServer -Name "YouTrack MCP" -Script "youtrack-mcp-server.js" -Port "5180"
        Start-Sleep -Seconds 2
        Start-MCPServer -Name "Web MCP" -Script "web-mcp-server.js" -Port "4200"
    }
    "2" {
        Start-MCPServer -Name "Orchestrator" -Script "multi-agent-orchestrator.js" -Port "4300"
    }
    "3" {
        Start-MCPServer -Name "YouTrack MCP" -Script "youtrack-mcp-server.js" -Port "5180"
    }
    "4" {
        Start-MCPServer -Name "Web MCP" -Script "web-mcp-server.js" -Port "4200"
    }
    "5" {
        Start-MCPServer -Name "Orchestrator" -Script "multi-agent-orchestrator.js" -Port "4300"
        Start-Sleep -Seconds 2
        Start-MCPServer -Name "YouTrack MCP" -Script "youtrack-mcp-server.js" -Port "5180"
    }
    "6" {
        Start-MCPServer -Name "Orchestrator" -Script "multi-agent-orchestrator.js" -Port "4300"
        Start-Sleep -Seconds 2
        Start-MCPServer -Name "Web MCP" -Script "web-mcp-server.js" -Port "4200"
    }
    "0" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit
    }
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Servers are starting in separate windows" -ForegroundColor Green
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "- Orchestrator: http://localhost:4300" -ForegroundColor White
Write-Host "- YouTrack MCP: http://localhost:5180" -ForegroundColor White
Write-Host "- Web MCP: http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "Check health status:" -ForegroundColor Yellow
Write-Host "- http://localhost:4300/health" -ForegroundColor White
Write-Host "- http://localhost:4300/status" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
