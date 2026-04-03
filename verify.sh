#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to verify a single project
verify_project() {
    local project_dir=$1
    local package_manager=$2
    local project_name=$3
    local errors=0
    
    echo -e "\n${BLUE}🔍 Verifying ${project_name}...${NC}"
    echo -e "${BLUE}=====================================${NC}"
    
    # Change to project directory
    cd "$project_dir" || {
        echo -e "${RED}❌ Failed to change to directory: $project_dir${NC}"
        return 1
    }
    
    # Run Biome formatting check
    echo -e "\n${YELLOW}📝 Checking formatting with Biome...${NC}"
    if $package_manager biome check --write src/; then
        echo -e "${GREEN}✅ Formatting check passed${NC}"
    else
        echo -e "${RED}❌ Formatting check failed${NC}"
        ((errors++))
    fi
    
    # Run oxlint
    echo -e "\n${YELLOW}🔎 Running oxlint...${NC}"
    if $package_manager oxlint src/; then
        echo -e "${GREEN}✅ Linting check passed${NC}"
    else
        echo -e "${RED}❌ Linting check failed${NC}"
        ((errors++))
    fi
    
    # Run TypeScript type checking (using tsc since tsgo doesn't exist)
    echo -e "\n${YELLOW}🔧 Running TypeScript type checking...${NC}"
    if $package_manager tsc --noEmit; then
        echo -e "${GREEN}✅ Type checking passed${NC}"
    else
        echo -e "${RED}❌ Type checking failed${NC}"
        ((errors++))
    fi
    
    # Run secretlint
    echo -e "\n${YELLOW}🔒 Scanning for secrets...${NC}"
    if $package_manager secretlint "src/**/*.{ts,tsx,js,jsx}"; then
        echo -e "${GREEN}✅ Secret scanning passed${NC}"
    else
        echo -e "${RED}❌ Secret scanning failed${NC}"
        ((errors++))
    fi
    
    # Return to original directory
    cd - > /dev/null
    
    # Return error count
    return $errors
}

# Main script
echo -e "${BLUE}🚀 Merch-From Code Verification${NC}"
echo -e "${BLUE}===============================${NC}"

total_errors=0

# Verify app project
verify_project "app" "bunx" "App Project"
app_errors=$?
total_errors=$((total_errors + app_errors))

# Verify mainpage project
verify_project "mainpage" "npx" "Mainpage Project"
mainpage_errors=$?
total_errors=$((total_errors + mainpage_errors))

# Final summary
echo -e "\n${BLUE}📊 Verification Summary${NC}"
echo -e "${BLUE}========================${NC}"

if [ $total_errors -eq 0 ]; then
    echo -e "${GREEN}🎉 All verification checks passed!${NC}"
    echo -e "${GREEN}✅ Ready to commit!${NC}"
    exit 0
else
    echo -e "${RED}❌ $total_errors verification check(s) failed${NC}"
    echo -e "${RED}🚫 Please fix the issues before committing${NC}"
    exit 1
fi