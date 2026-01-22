#!/bin/bash

# Ralph Testing Loop Launcher for Color Consultant Pro
# This script launches Ralph in testing mode to automate test creation

set -e

RALPH_HOME="${RALPH_HOME:-$HOME/.ralph}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🎯 Starting Ralph Testing Loop for Color Consultant Pro"
echo "=================================================="
echo ""
echo "Ralph will:"
echo "  - Read test requirements from specs/testing-requirements.md"
echo "  - Follow tasks in @fix_plan_testing.md"
echo "  - Create automated E2E tests using Playwright"
echo "  - Run tests and verify they pass"
echo ""
echo "Project directory: $PROJECT_DIR"
echo "Ralph home: $RALPH_HOME"
echo ""

# Check if Ralph is set up
if [ ! -f "$RALPH_HOME/ralph_loop.sh" ]; then
    echo "❌ Error: Ralph not found at $RALPH_HOME"
    echo ""
    echo "Please set up Ralph first:"
    echo "  cd $RALPH_HOME"
    echo "  ./setup.sh"
    exit 1
fi

# Check if testing files exist
if [ ! -f "$PROJECT_DIR/PROMPT_TESTING.md" ]; then
    echo "❌ Error: PROMPT_TESTING.md not found"
    echo "Please create the testing prompt file first."
    exit 1
fi

if [ ! -f "$PROJECT_DIR/@fix_plan_testing.md" ]; then
    echo "❌ Error: @fix_plan_testing.md not found"
    echo "Please create the testing plan file first."
    exit 1
fi

# Temporarily rename files for Ralph
echo "📝 Setting up Ralph testing environment..."
if [ -f "$PROJECT_DIR/PROMPT.md" ]; then
    mv "$PROJECT_DIR/PROMPT.md" "$PROJECT_DIR/PROMPT_FEATURES.md.bak"
fi
if [ -f "$PROJECT_DIR/@fix_plan.md" ]; then
    mv "$PROJECT_DIR/@fix_plan.md" "$PROJECT_DIR/@fix_plan_features.md.bak"
fi

cp "$PROJECT_DIR/PROMPT_TESTING.md" "$PROJECT_DIR/PROMPT.md"
cp "$PROJECT_DIR/@fix_plan_testing.md" "$PROJECT_DIR/@fix_plan.md"

echo "✅ Testing environment ready"
echo ""

# Set up cleanup trap
cleanup() {
    echo ""
    echo "🧹 Restoring original files..."
    if [ -f "$PROJECT_DIR/PROMPT_FEATURES.md.bak" ]; then
        mv "$PROJECT_DIR/PROMPT_FEATURES.md.bak" "$PROJECT_DIR/PROMPT.md"
    else
        rm -f "$PROJECT_DIR/PROMPT.md"
    fi
    if [ -f "$PROJECT_DIR/@fix_plan_features.md.bak" ]; then
        mv "$PROJECT_DIR/@fix_plan_features.md.bak" "$PROJECT_DIR/@fix_plan.md"
    else
        rm -f "$PROJECT_DIR/@fix_plan.md"
    fi
    echo "✅ Cleanup complete"
}

trap cleanup EXIT

# Launch Ralph
echo "🚀 Launching Ralph Testing Loop..."
echo ""
echo "Press Ctrl+C to stop Ralph at any time"
echo ""

cd "$PROJECT_DIR"

# Run Ralph with testing-appropriate settings
"$RALPH_HOME/ralph_loop.sh" \
    --calls 50 \
    -t 20 \
    --allowed-tools "Write,Read,Edit,Glob,Grep,Bash(npm *),Bash(npx *)" \
    --verbose

echo ""
echo "🎉 Ralph testing session complete!"
