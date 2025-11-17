#!/bin/bash
#$0 - The name of the Bash script.
#$1 - $9 - The first 9 arguments to the Bash script. (As mentioned above.)
#$# - How many arguments were passed to the Bash script.
#$@ - All the arguments supplied to the Bash script.
#$? - The exit status of the most recently run process.
#$$ - The process ID of the current script.
#$USER - The username of the user running the script.
#$HOSTNAME - The hostname of the machine the script is running on.
#$SECONDS - The number of seconds since the script was started.
#$RANDOM - Returns a different random number each time is it referred to.
#$LINENO - Returns the current line number in the Bash script.

# Build Clean Script for Reactory
# This script ensures git repositories are not copied during build process

set -e

# Source shell utilities
source ./bin/shared/shell-utils.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to clean git repositories from build folders
clean_build_git_repos() {
    print_status "Cleaning git repositories from build folders..."
    
    local build_git_dirs=$(find $REACTORY_HOME -path "*/build/*" -name ".git" -type d 2>/dev/null || true)
    
    if [ -z "$build_git_dirs" ]; then
        print_success "No git repositories found in build folders"
        return 0
    fi
    
    local count=0
    while IFS= read -r git_dir; do
        if [ -n "$git_dir" ] && [ -d "$git_dir" ]; then
            count=$((count + 1))
            print_status "Removing: $git_dir"
            rm -rf "$git_dir"
        fi
    done <<< "$build_git_dirs"
    
    print_success "Cleaned $count git repositories from build folders"
}

# Function to create .gitignore files in build directories
create_build_gitignores() {
    print_status "Creating .gitignore files in build directories..."
    
    # Find all build directories
    local build_dirs=$(find $REACTORY_HOME -type d -name "build" 2>/dev/null || true)
    
    while IFS= read -r build_dir; do
        if [ -n "$build_dir" ] && [ -d "$build_dir" ]; then
            local gitignore_file="$build_dir/.gitignore"
            
            # Create .gitignore if it doesn't exist
            if [ ! -f "$gitignore_file" ]; then
                cat > "$gitignore_file" << 'EOF'
# Ignore everything in build directories
*
!.gitignore
EOF
                print_status "Created: $gitignore_file"
            fi
        fi
    done <<< "$build_dirs"
    
    print_success "Created .gitignore files in build directories"
}

# Function to check for git repositories in build folders
check_build_git_repos() {
    print_status "Checking for git repositories in build folders..."
    
    local build_git_dirs=$(find $REACTORY_HOME -path "*/build/*" -name ".git" -type d 2>/dev/null || true)
    
    if [ -z "$build_git_dirs" ]; then
        print_success "No git repositories found in build folders"
        return 0
    else
        print_warning "Found git repositories in build folders:"
        while IFS= read -r git_dir; do
            if [ -n "$git_dir" ]; then
                echo "  - $git_dir"
            fi
        done <<< "$build_git_dirs"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "Build Clean Script for Reactory"
    echo "==============================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  clean      - Remove git repositories from build folders"
    echo "  check      - Check for git repositories in build folders"
    echo "  gitignore  - Create .gitignore files in build directories"
    echo "  all        - Run all cleanup operations"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 clean     # Remove git repos from build folders"
    echo "  $0 check     # Check for git repos in build folders"
    echo "  $0 all       # Run all cleanup operations"
    echo ""
}

# Main script logic
case "${1:-help}" in
    "clean")
        clean_build_git_repos
        ;;
    "check")
        check_build_git_repos
        ;;
    "gitignore")
        create_build_gitignores
        ;;
    "all")
        print_status "Running all cleanup operations..."
        clean_build_git_repos
        create_build_gitignores
        check_build_git_repos
        print_success "All cleanup operations completed"
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 