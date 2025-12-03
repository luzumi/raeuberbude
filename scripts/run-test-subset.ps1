# Wrapper to run update-dbm-simple.ps1 for a TEST_IDS subset
$env:TEST_IDS = 'LUD28-57,LUD28-58,LUD28-59'
Write-Host "Running update-dbm-simple.ps1 for: $env:TEST_IDS"
& 'C:\Users\corat\IdeaProjects\raueberbude\scripts\update-dbm-simple.ps1'

