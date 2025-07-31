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

# Git Manager for Reactory Multi-Repository Setup
# This script helps manage all git repositories in the project

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

# Function to find all git repositories (excluding build folders)
find_repositories() {
    find $REACTORY_HOME -name ".git" -type d | grep -v "/build/" | sed 's|/.git||' | sort
}

# Function to execute git command in all repositories
execute_in_all_repos() {
    local command="$1"
    local description="$2"
    
    print_status "Executing: $description"
    echo "=================================="
    
    local repos=$(find_repositories)
    local total_repos=$(echo "$repos" | wc -l)
    local current=0
    
    while IFS= read -r repo; do
        if [ -n "$repo" ]; then
            current=$((current + 1))
            echo -e "\n${BLUE}[$current/$total_repos]${NC} $repo"
            echo "----------------------------------"
            
            if [ -d "$repo" ]; then
                cd "$repo"
                if git rev-parse --git-dir > /dev/null 2>&1; then
                    eval "$command" || print_warning "Command failed in $repo"
                else
                    print_warning "Not a git repository: $repo"
                fi
                cd - > /dev/null
            else
                print_warning "Directory not found: $repo"
            fi
        fi
    done <<< "$repos"
    
    echo -e "\n${GREEN}Completed: $description${NC}"
}

# Function to show status of all repositories
show_status() {
    print_status "Checking status of all repositories..."
    execute_in_all_repos "git status --porcelain" "Status Check"
}

# Function to pull all repositories
pull_all() {
    print_status "Pulling latest changes from all repositories..."
    execute_in_all_repos "git pull" "Pull Changes"
}

# Function to push all repositories
push_all() {
    print_status "Pushing changes to all repositories..."
    execute_in_all_repos "git push" "Push Changes"
}

# Function to show branch information
show_branches() {
    print_status "Showing branch information for all repositories..."
    execute_in_all_repos "echo \"Current branch: \$(git branch --show-current)\" && git branch -a" "Branch Information"
}

# Function to show recent commits
show_recent_commits() {
    print_status "Showing recent commits for all repositories..."
    execute_in_all_repos "git log --oneline -5" "Recent Commits"
}

# Function to show repository list
list_repositories() {
    print_status "Found repositories:"
    echo "===================="
    local repos=$(find_repositories)
    local count=0
    
    while IFS= read -r repo; do
        if [ -n "$repo" ]; then
            count=$((count + 1))
            echo "$count. $repo"
        fi
    done <<< "$repos"
    
    echo -e "\nTotal repositories: $count"
}

# Function to clean build folders of git repositories
cleanup_build_folders() {
    print_status "Cleaning git repositories from build folders..."
    echo "=================================================="
    
    local build_git_dirs=$(find $REACTORY_HOME -path "*/build/*" -name ".git" -type d)
    local count=0
    
    if [ -z "$build_git_dirs" ]; then
        print_success "No git repositories found in build folders"
        return 0
    fi
    
    while IFS= read -r git_dir; do
        if [ -n "$git_dir" ]; then
            count=$((count + 1))
            echo -e "\n${BLUE}[$count]${NC} Removing: $git_dir"
            
            if [ -d "$git_dir" ]; then
                rm -rf "$git_dir"
                print_success "Removed: $git_dir"
            else
                print_warning "Directory not found: $git_dir"
            fi
        fi
    done <<< "$build_git_dirs"
    
    echo -e "\n${GREEN}Cleaned $count git repositories from build folders${NC}"
}

# Function to show help
show_help() {
    echo "Git Manager for Reactory Multi-Repository Setup"
    echo "=============================================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status     - Show status of all repositories"
    echo "  pull       - Pull latest changes from all repositories"
    echo "  push       - Push changes to all repositories"
    echo "  branches   - Show branch information for all repositories"
    echo "  commits    - Show recent commits for all repositories"
    echo "  list       - List all repositories"
    echo "  cleanup    - Remove git repositories from build folders"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status    # Check status of all repos"
    echo "  $0 pull      # Pull changes from all repos"
    echo "  $0 push      # Push changes to all repos"
    echo ""
}

# Main script logic
case "${1:-help}" in
    "status")
        show_status
        ;;
    "pull")
        pull_all
        ;;
    "push")
        push_all
        ;;
    "branches")
        show_branches
        ;;
    "commits")
        show_recent_commits
        ;;
    "list")
        list_repositories
        ;;
    "cleanup")
        cleanup_build_folders
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