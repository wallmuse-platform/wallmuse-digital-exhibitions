/**
 * INTERNAL TESTING: JavaScript Bundle Loading Simulation
 * Tests the exact scenario causing React, ReactDOM, and App to be undefined
 */

console.log('🧪 [TEST] Starting JavaScript bundle loading test...');

// Test 1: Check if we're in a browser environment
function testBrowserEnvironment() {
    console.log('\n🧪 [TEST] Testing Browser Environment...');
    
    const results = {
        windowExists: typeof window !== 'undefined',
        documentExists: typeof document !== 'undefined',
        consoleExists: typeof console !== 'undefined',
        setTimeoutExists: typeof setTimeout !== 'undefined'
    };
    
    console.log('🧪 [TEST] Browser environment check:', results);
    
    const success = Object.values(results).every(r => r);
    console.log('🧪 [TEST] Browser environment test:', success ? '✅ PASSED' : '❌ FAILED');
    return success;
}

// Test 2: Check if React dependencies are available
function testReactDependencies() {
    console.log('\n🧪 [TEST] Testing React Dependencies...');
    
    // Try to require React (Node.js style)
    let React, ReactDOM, App;
    
    try {
        React = require('react');
        console.log('🧪 [TEST] React loaded via require:', typeof React);
    } catch (e) {
        console.log('🧪 [TEST] React require failed:', e.message);
    }
    
    try {
        ReactDOM = require('react-dom');
        console.log('🧪 [TEST] ReactDOM loaded via require:', typeof ReactDOM);
    } catch (e) {
        console.log('🧪 [TEST] ReactDOM require failed:', e.message);
    }
    
    try {
        App = require('./src/App');
        console.log('🧪 [TEST] App loaded via require:', typeof App);
    } catch (e) {
        console.log('🧪 [TEST] App require failed:', e.message);
    }
    
    // Check global scope
    const globalReact = (typeof window !== 'undefined') ? window.React : global.React;
    const globalReactDOM = (typeof window !== 'undefined') ? window.ReactDOM : global.ReactDOM;
    
    console.log('🧪 [TEST] Global React check:', {
        globalReact: typeof globalReact,
        globalReactDOM: typeof globalReactDOM
    });
    
    const success = React || globalReact || ReactDOM || globalReactDOM;
    console.log('🧪 [TEST] React dependencies test:', success ? '✅ PASSED' : '❌ FAILED');
    return success;
}

// Test 3: Check if bundle files exist and are accessible
function testBundleFiles() {
    console.log('\n🧪 [TEST] Testing Bundle Files...');
    
    if (typeof window === 'undefined') {
        console.log('🧪 [TEST] Not in browser, skipping bundle file test');
        return true;
    }
    
    // Check what scripts are currently loaded
    const scripts = Array.from(document.scripts);
    console.log('🧪 [TEST] Currently loaded scripts:', scripts.length);
    
    scripts.forEach((script, index) => {
        console.log(`🧪 [TEST] Script ${index}:`, {
            src: script.src,
            type: script.type,
            loaded: script.complete,
            readyState: script.readyState
        });
    });
    
    // Check for bundle files
    const bundleScripts = scripts.filter(s => 
        s.src && (s.src.includes('main') || s.src.includes('bundle') || s.src.includes('static/js'))
    );
    
    console.log('🧪 [TEST] Bundle scripts found:', bundleScripts.length);
    
    if (bundleScripts.length === 0) {
        console.log('🧪 [TEST] ⚠️ No bundle scripts found - this explains why React is undefined!');
    }
    
    const success = bundleScripts.length > 0;
    console.log('🧪 [TEST] Bundle files test:', success ? '✅ PASSED' : '❌ FAILED');
    return success;
}

// Test 4: Check if build process is working
function testBuildProcess() {
    console.log('\n🧪 [TEST] Testing Build Process...');
    
    // Check if we're in development or production
    const isDevelopment = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
    const isProduction = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';
    
    console.log('🧪 [TEST] Environment check:', {
        isDevelopment,
        isProduction,
        nodeEnv: process?.env?.NODE_ENV
    });
    
    // Check if build files exist (Node.js only)
    if (typeof require !== 'undefined' && typeof process !== 'undefined') {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Check if build directory exists
            const buildDir = path.join(process.cwd(), 'build');
            const buildExists = fs.existsSync(buildDir);
            
            if (buildExists) {
                const buildFiles = fs.readdirSync(buildDir);
                const jsFiles = buildFiles.filter(f => f.endsWith('.js'));
                const cssFiles = buildFiles.filter(f => f.endsWith('.css'));
                
                console.log('🧪 [TEST] Build directory contents:', {
                    buildDir,
                    totalFiles: buildFiles.length,
                    jsFiles: jsFiles.length,
                    cssFiles: cssFiles.length,
                    jsFiles: jsFiles.slice(0, 5) // Show first 5 JS files
                });
            } else {
                console.log('🧪 [TEST] ⚠️ Build directory not found - build may have failed!');
            }
            
            return buildExists;
        } catch (e) {
            console.log('🧪 [TEST] Could not check build files:', e.message);
            return false;
        }
    } else {
        console.log('🧪 [TEST] Not in Node.js environment, skipping build check');
        return true;
    }
}

// Test 5: Check if there are any JavaScript errors
function testJavaScriptErrors() {
    console.log('\n🧪 [TEST] Testing JavaScript Errors...');
    
    if (typeof window === 'undefined') {
        console.log('🧪 [TEST] Not in browser, skipping error test');
        return true;
    }
    
    // Check if there are any unhandled errors
    let errorCount = 0;
    
    // Override console.error to catch errors
    const originalError = console.error;
    console.error = (...args) => {
        errorCount++;
        console.log(`🧪 [TEST] Error ${errorCount} caught:`, ...args);
        originalError.apply(console, args);
    };
    
    // Try to access React components
    try {
        if (typeof React !== 'undefined') {
            console.log('🧪 [TEST] React is available');
        } else {
            console.log('🧪 [TEST] React is undefined');
        }
    } catch (e) {
        console.log('🧪 [TEST] Error accessing React:', e.message);
    }
    
    try {
        if (typeof ReactDOM !== 'undefined') {
            console.log('🧪 [TEST] ReactDOM is available');
        } else {
            console.log('🧪 [TEST] ReactDOM is undefined');
        }
    } catch (e) {
        console.log('🧪 [TEST] Error accessing ReactDOM:', e.message);
    }
    
    try {
        if (typeof App !== 'undefined') {
            console.log('🧪 [TEST] App component is available');
        } else {
            console.log('🧪 [TEST] App component is undefined');
        }
    } catch (e) {
        console.log('🧪 [TEST] Error accessing App:', e.message);
    }
    
    // Restore console.error
    console.error = originalError;
    
    const success = errorCount === 0;
    console.log('🧪 [TEST] JavaScript errors test:', success ? '✅ PASSED' : '❌ FAILED');
    console.log('🧪 [TEST] Total errors caught:', errorCount);
    return success;
}

// Test 6: Simulate the exact scenario from your logs
function testExactScenario() {
    console.log('\n🧪 [TEST] Testing Exact Scenario from Logs...');
    
    // Simulate what should happen when the page loads
    console.log('🧪 [TEST] Simulating page load sequence...');
    
    // Step 1: Check if root element exists
    const rootElement = document.getElementById('root-wm-player');
    console.log('🧪 [TEST] Step 1 - Root element check:', {
        exists: !!rootElement,
        id: rootElement?.id,
        childElementCount: rootElement?.childElementCount || 0
    });
    
    // Step 2: Check if React should be available
    console.log('🧪 [TEST] Step 2 - React availability check:', {
        React: typeof React,
        ReactDOM: typeof ReactDOM,
        App: typeof App
    });
    
    // Step 3: Check if initialization should have happened
    console.log('🧪 [TEST] Step 3 - Initialization check:', {
        hasReactRoot: !!document.querySelector('[data-reactroot]'),
        hasReactRoot: !!document.querySelector('[data-reactroot]'),
        windowTheApp: !!window.TheApp
    });
    
    // Step 4: Simulate what should happen
    if (rootElement && typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
        console.log('🧪 [TEST] Step 4 - Attempting React mount simulation...');
        try {
            // This is what should happen in index.tsx
            const root = ReactDOM.createRoot(rootElement);
            root.render(React.createElement('div', { 
                style: { color: 'green', fontSize: '18px', padding: '10px' } 
            }, '🧪 React Mount Test - This should appear if React works!'));
            console.log('🧪 [TEST] ✅ React mount simulation successful!');
            return true;
        } catch (e) {
            console.log('🧪 [TEST] ❌ React mount simulation failed:', e.message);
            return false;
        }
    } else {
        console.log('🧪 [TEST] Step 4 - Cannot simulate React mount (missing dependencies)');
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('🧪 [TEST] ========================================');
    console.log('🧪 [TEST] RUNNING JAVASCRIPT BUNDLE LOADING TESTS');
    console.log('🧪 [TEST] ========================================');
    
    const results = {
        browserEnvironment: testBrowserEnvironment(),
        reactDependencies: testReactDependencies(),
        bundleFiles: testBundleFiles(),
        buildProcess: testBuildProcess(),
        javascriptErrors: testJavaScriptErrors(),
        exactScenario: testExactScenario()
    };
    
    console.log('\n🧪 [TEST] ========================================');
    console.log('🧪 [TEST] TEST RESULTS SUMMARY');
    console.log('🧪 [TEST] ========================================');
    
    Object.entries(results).forEach(([test, result]) => {
        console.log(`🧪 [TEST] ${test}: ${result ? '✅ PASSED' : '❌ FAILED'}`);
    });
    
    const allPassed = Object.values(results).every(r => r);
    console.log(`\n🧪 [TEST] OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (!allPassed) {
        console.log('\n🧪 [TEST] FAILURE ANALYSIS:');
        if (!results.browserEnvironment) {
            console.log('🧪 [TEST] ❌ Browser environment issues');
        }
        if (!results.reactDependencies) {
            console.log('🧪 [TEST] ❌ React dependencies not loaded - BUNDLE LOADING FAILURE');
        }
        if (!results.bundleFiles) {
            console.log('🧪 [TEST] ❌ Bundle files not found - BUILD/SERVER ISSUE');
        }
        if (!results.buildProcess) {
            console.log('🧪 [TEST] ❌ Build process failed');
        }
        if (!results.javascriptErrors) {
            console.log('🧪 [TEST] ❌ JavaScript errors preventing execution');
        }
        if (!results.exactScenario) {
            console.log('🧪 [TEST] ❌ Exact scenario simulation failed');
        }
        
        // Provide specific recommendations
        if (!results.reactDependencies && !results.bundleFiles) {
            console.log('\n🧪 [TEST] 🚨 CRITICAL ISSUE IDENTIFIED:');
            console.log('🧪 [TEST] JavaScript bundle is not loading! This explains why React, ReactDOM, and App are undefined.');
            console.log('🧪 [TEST] RECOMMENDATIONS:');
            console.log('🧪 [TEST] 1. Check if build process completed successfully');
            console.log('🧪 [TEST] 2. Check if bundle files exist in build/ directory');
            console.log('🧪 [TEST] 3. Check if server is serving JavaScript files correctly');
            console.log('🧪 [TEST] 4. Check browser console for 404 errors on .js files');
        }
    }
    
    return allPassed;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests };
} else {
    // Browser environment
    window.testBundleLoading = { runAllTests };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    console.log('🧪 [TEST] Auto-running tests in browser console...');
    setTimeout(() => runAllTests(), 1000);
} 