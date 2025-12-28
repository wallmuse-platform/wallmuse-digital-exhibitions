#!/bin/bash

echo "🧪 Running Sequencer Looping Tests..."
echo "======================================"

# Run the specific test files
echo "🧪 Running Logic Tests..."
npm test -- --testPathPattern=Sequencer.test.ts --verbose

echo ""
echo "🧪 Running Integration Tests..."
npm test -- --testPathPattern=Sequencer.integration.test.ts --verbose

echo ""
echo "✅ Tests completed!"
echo ""
echo "📋 Test Summary:"
echo "- Advancement Threshold Logic: Tests the core logic that was causing the looping issue"
echo "- Loop Detection Logic: Tests cycle completion detection"
echo "- Timing Logic: Tests advancement conditions"
echo ""
echo "🔧 If tests fail, the issue is in the sequencer logic and needs to be fixed." 