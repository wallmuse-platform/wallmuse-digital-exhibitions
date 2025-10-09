/**
 * BROWSER REALITY CHECK: What's Actually Working vs Not Working
 * Tests the exact disconnect between working backend and broken React
 */

console.log('🧪 [REALITY CHECK] Starting browser reality check...');

// Test 1: Check what's actually available in the browser
function testBrowserReality() {
    console.log('\n🧪 [REALITY CHECK] Testing Browser Reality...');
    
    const reality = {
        // Basic browser environment
        windowExists: typeof window !== 'undefined',
        documentExists: typeof document !== 'undefined',
        consoleExists: typeof console !== 'undefined',
        
        // React availability
        ReactAvailable: typeof React !== 'undefined',
        ReactDOMAvailable: typeof ReactDOM !== 'undefined',
        AppAvailable: typeof App !== 'undefined',
        
        // Global objects
        TheAppExists: typeof window.TheApp !== 'undefined',
        SequencerExists: typeof window.Sequencer !== 'undefined',
        ItemPlayerExists: typeof window.ItemPlayer !== 'undefined',
        
        // DOM state
        rootElementExists: !!document.getElementById('root-wm-player'),
        rootElementChildren: document.getElementById('root-wm-player')?.childElementCount || 0,
        rootElementHTML: document.getElementById('root-wm-player')?.innerHTML || 'NOT_FOUND',
        
        // Script loading
        scriptsLoaded: document.scripts.length,
        bundleScripts: Array.from(document.scripts).filter(s => 
            s.src && (s.src.includes('main') || s.src.includes('bundle'))
        ).length
    };
    
    console.log('🧪 [REALITY CHECK] Browser reality:', reality);
    
    // Analyze the disconnect
    if (reality.ReactAvailable && reality.ReactDOMAvailable && reality.AppAvailable) {
        console.log('🧪 [REALITY CHECK] ✅ React dependencies are loaded');
    } else {
        console.log('🧪 [REALITY CHECK] ❌ React dependencies are NOT loaded');
    }
    
    if (reality.rootElementExists && reality.rootElementChildren > 0) {
        console.log('🧪 [REALITY CHECK] ✅ React has mounted into DOM');
    } else {
        console.log('🧪 [REALITY CHECK] ❌ React has NOT mounted into DOM');
    }
    
    if (reality.bundleScripts > 0) {
        console.log('🧪 [REALITY CHECK] ✅ Bundle scripts are loaded');
    } else {
        console.log('🧪 [REALITY CHECK] ❌ Bundle scripts are NOT loaded');
    }
    
    return reality;
}

// Test 2: Check if the issue is React initialization vs React mounting
function testReactInitialization() {
    console.log('\n🧪 [REALITY CHECK] Testing React Initialization...');
    
    // Check if React initialization script ran
    const initializationLogs = [
        '[React] Starting React initialization...',
        '[React] Creating root for element...',
        '[React] App component rendered successfully',
        '[React] ✅ React app initialized successfully!'
    ];
    
    console.log('🧪 [REALITY CHECK] Looking for React initialization logs...');
    console.log('🧪 [REALITY CHECK] Check your console for these messages:');
    initializationLogs.forEach(log => {
        console.log('🧪 [REALITY CHECK] Expected:', log);
    });
    
    // Check if React root was created
    const reactRoot = document.querySelector('[data-reactroot]') || document.querySelector('[data-reactroot]');
    const hasReactRoot = !!reactRoot;
    
    console.log('🧪 [REALITY CHECK] React root check:', {
        hasReactRoot,
        reactRootElement: reactRoot?.tagName,
        reactRootHTML: reactRoot?.innerHTML?.substring(0, 100) + '...'
    });
    
    if (hasReactRoot) {
        console.log('🧪 [REALITY CHECK] ✅ React root exists - React mounted successfully');
    } else {
        console.log('🧪 [REALITY CHECK] ❌ React root missing - React never mounted');
    }
    
    return hasReactRoot;
}

// Test 3: Check if the issue is script loading vs script execution
function testScriptExecution() {
    console.log('\n🧪 [REALITY CHECK] Testing Script Execution...');
    
    // Check what scripts are actually loaded
    const allScripts = Array.from(document.scripts);
    console.log('🧪 [REALITY CHECK] All scripts loaded:', allScripts.length);
    
    allScripts.forEach((script, index) => {
        console.log(`🧪 [REALITY CHECK] Script ${index}:`, {
            src: script.src,
            type: script.type,
            loaded: script.complete,
            readyState: script.readyState,
            hasContent: !!script.innerHTML
        });
    });
    
    // Check for bundle scripts specifically
    const bundleScripts = allScripts.filter(s => 
        s.src && (s.src.includes('main') || s.src.includes('bundle'))
    );
    
    console.log('🧪 [REALITY CHECK] Bundle scripts found:', bundleScripts.length);
    
    if (bundleScripts.length === 0) {
        console.log('🧪 [REALITY CHECK] 🚨 NO BUNDLE SCRIPTS - This explains everything!');
        console.log('🧪 [REALITY CHECK] The JavaScript bundle is not loading, so React never initializes');
    } else {
        console.log('🧪 [REALITY CHECK] ✅ Bundle scripts found - checking if they executed');
        
        bundleScripts.forEach((script, index) => {
            console.log(`🧪 [REALITY CHECK] Bundle script ${index}:`, {
                src: script.src,
                loaded: script.complete,
                readyState: script.readyState
            });
        });
    }
    
    return bundleScripts.length > 0;
}

// Test 4: Check if the issue is timing vs code
function testTimingIssues() {
    console.log('\n🧪 [REALITY CHECK] Testing Timing Issues...');
    
    // Check if we're in the right phase of page load
    const pageLoadState = {
        readyState: document.readyState,
        hasBody: !!document.body,
        bodyChildren: document.body?.children?.length || 0,
        rootElementReady: !!document.getElementById('root-wm-player')
    };
    
    console.log('🧪 [REALITY CHECK] Page load state:', pageLoadState);
    
    // Check if React initialization should have happened
    if (pageLoadState.readyState === 'complete') {
        console.log('🧪 [REALITY CHECK] ✅ Page fully loaded - React should have initialized');
    } else if (pageLoadState.readyState === 'interactive') {
        console.log('🧪 [REALITY CHECK] ⚠️ Page interactive but not complete - React might still be loading');
    } else {
        console.log('🧪 [REALITY CHECK] ❌ Page still loading - React initialization might be waiting');
    }
    
    return pageLoadState.readyState === 'complete';
}

// Test 5: Check if the issue is external interference
function testExternalInterference() {
    console.log('\n🧪 [REALITY CHECK] Testing External Interference...');
    
    // Check if something is clearing the root element
    const rootElement = document.getElementById('root-wm-player');
    if (rootElement) {
        // Monitor for changes
        const originalHTML = rootElement.innerHTML;
        console.log('🧪 [REALITY CHECK] Root element current HTML length:', originalHTML.length);
        
        // Check if something is actively clearing it
        setTimeout(() => {
            const currentHTML = rootElement.innerHTML;
            if (currentHTML.length < originalHTML.length) {
                console.log('🧪 [REALITY CHECK] 🚨 WARNING: Root element HTML was cleared!');
                console.log('🧪 [REALITY CHECK] Original length:', originalHTML.length);
                console.log('🧪 [REALITY CHECK] Current length:', currentHTML.length);
            } else {
                console.log('🧪 [REALITY CHECK] ✅ Root element HTML maintained');
            }
        }, 1000);
        
        return true;
    } else {
        console.log('🧪 [REALITY CHECK] ❌ Root element not found - major issue!');
        return false;
    }
}

// Run all reality checks
function runRealityChecks() {
    console.log('🧪 [REALITY CHECK] ========================================');
    console.log('🧪 [REALITY CHECK] RUNNING BROWSER REALITY CHECKS');
    console.log('🧪 [REALITY CHECK] ========================================');
    
    const results = {
        browserReality: testBrowserReality(),
        reactInitialization: testReactInitialization(),
        scriptExecution: testScriptExecution(),
        timingIssues: testTimingIssues(),
        externalInterference: testExternalInterference()
    };
    
    console.log('\n🧪 [REALITY CHECK] ========================================');
    console.log('🧪 [REALITY CHECK] REALITY CHECK SUMMARY');
    console.log('🧪 [REALITY CHECK] ========================================');
    
    // Analyze the disconnect
    const hasReactDeps = results.browserReality.ReactAvailable && results.browserReality.ReactDOMAvailable;
    const hasReactRoot = results.reactInitialization;
    const hasBundleScripts = results.scriptExecution;
    const pageReady = results.timingIssues;
    
    console.log('🧪 [REALITY CHECK] Analysis:', {
        hasReactDependencies: hasReactDeps,
        hasReactRoot: hasReactRoot,
        hasBundleScripts: hasBundleScripts,
        pageReady: pageReady
    });
    
    if (!hasReactDeps) {
        console.log('🧪 [REALITY CHECK] 🚨 ROOT CAUSE: React dependencies not loaded');
        console.log('🧪 [REALITY CHECK] This means the JavaScript bundle failed to load or execute');
    } else if (!hasReactRoot) {
        console.log('🧪 [REALITY CHECK] 🚨 ROOT CAUSE: React dependencies loaded but never mounted');
        console.log('🧪 [REALITY CHECK] This means React initialization failed or was blocked');
    } else {
        console.log('🧪 [REALITY CHECK] ✅ React is working - issue must be elsewhere');
    }
    
    return results;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runRealityChecks };
} else {
    // Browser environment
    window.realityCheck = { runRealityChecks };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    console.log('🧪 [REALITY CHECK] Auto-running reality checks in browser console...');
    setTimeout(() => runRealityChecks(), 1000);
} 