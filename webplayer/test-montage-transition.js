// Test script to diagnose montage transition issues
console.log('🔍 Montage Transition Test Script Loaded');

// Expose debug functions to global window
window.montageTest = {
    
    // Test current state
    testCurrentState: function() {
        console.log('🔍 === TESTING CURRENT STATE ===');
        
        if (window.TheApp) {
            console.log('✅ TheApp exists');
            console.log('TheApp state:', {
                imageShown: window.TheApp.state.imageShown,
                videoShown: window.TheApp.state.videoShown,
                video1: window.TheApp.state.video1,
                video2: window.TheApp.state.video2
            });
        } else {
            console.log('❌ TheApp not found');
        }
        
        if (window.Sequencer) {
            console.log('✅ Sequencer exists');
            console.log('Sequencer status:', window.Sequencer.getStatus());
            console.log('Sequencer offset:', window.Sequencer.offset);
        } else {
            console.log('❌ Sequencer not found');
        }
        
        if (window.ItemPlayer && window.ItemPlayer.ThePlayer) {
            console.log('✅ ItemPlayer exists');
            const currentPos = window.ItemPlayer.ThePlayer.getPosition();
            const nextPos = window.ItemPlayer.ThePlayer.getNextPosition();
            
            console.log('Current Position:', currentPos ? {
                montageIndex: currentPos.getMontageIndex(),
                trackIndex: currentPos.getTrackIndex(),
                itemIndex: currentPos.getItemIndex(),
                duration: currentPos.getDuration()
            } : 'null');
            
            console.log('Next Position:', nextPos ? {
                montageIndex: nextPos.getMontageIndex(),
                trackIndex: nextPos.getTrackIndex(),
                itemIndex: nextPos.getItemIndex(),
                duration: nextPos.getDuration()
            } : 'null');
        } else {
            console.log('❌ ItemPlayer not found');
        }
    },
    
    // Test montage advancement
    testMontageAdvancement: function() {
        console.log('🔍 === TESTING MONTAGE ADVANCEMENT ===');
        
        if (window.Sequencer) {
            console.log('Current offset:', window.Sequencer.offset);
            console.log('Current status:', window.Sequencer.getStatus());
            
            // Try to force advancement
            if (window.Sequencer.status === window.Sequencer.SequencerStatus.Playing) {
                console.log('Forcing time-based advancement...');
                window.Sequencer.forceAdvance = true;
            }
        }
    },
    
    // Test playlist data
    testPlaylistData: function() {
        console.log('🔍 === TESTING PLAYLIST DATA ===');
        
        if (window.getThePlaylist) {
            const playlist = window.getThePlaylist();
            if (playlist) {
                console.log('Playlist:', {
                    id: playlist.id,
                    name: playlist.name,
                    montageCount: playlist.getMontagesCount()
                });
                
                // Check each montage
                for (let i = 0; i < playlist.getMontagesCount(); i++) {
                    const montage = playlist.getMontage(i);
                    if (montage) {
                        console.log(`Montage ${i}:`, {
                            id: montage.id,
                            name: montage.name,
                            duration: montage.duration,
                            trackCount: montage.seqs ? montage.seqs.length : 0
                        });
                    }
                }
            } else {
                console.log('No playlist loaded');
            }
        }
    },
    
    // Test position validation
    testPositionValidation: function() {
        console.log('🔍 === TESTING POSITION VALIDATION ===');
        
        if (window.ItemPlayer && window.ItemPlayer.ThePlayer) {
            const currentPos = window.ItemPlayer.ThePlayer.getPosition();
            if (currentPos) {
                console.log('Validating current position...');
                
                // Test getNextPosition calculation
                if (window.Sequencer && window.Sequencer.getNextPosition) {
                    const nextPos = window.Sequencer.getNextPosition(currentPos);
                    console.log('Calculated next position:', nextPos ? {
                        montageIndex: nextPos.getMontageIndex(),
                        trackIndex: nextPos.getTrackIndex(),
                        itemIndex: nextPos.getItemIndex(),
                        duration: nextPos.getDuration()
                    } : 'null');
                }
            }
        }
    },
    
    // Run all tests
    runAllTests: function() {
        console.log('🚀 === RUNNING ALL MONTAGE TESTS ===');
        this.testCurrentState();
        this.testPlaylistData();
        this.testPositionValidation();
        this.testMontageAdvancement();
        console.log('✅ All tests completed');
    },
    
    // Monitor montage transitions
    startMonitoring: function() {
        console.log('🔍 Starting montage transition monitoring...');
        
        // Monitor every second
        this.monitorInterval = setInterval(() => {
            if (window.ItemPlayer && window.ItemPlayer.ThePlayer) {
                const currentPos = window.ItemPlayer.ThePlayer.getPosition();
                const nextPos = window.ItemPlayer.ThePlayer.getNextPosition();
                
                if (currentPos) {
                    console.log(`[MONITOR] Current: M${currentPos.getMontageIndex()}, Next: ${nextPos ? 'M' + nextPos.getMontageIndex() : 'null'}, Offset: ${window.Sequencer ? window.Sequencer.offset.toFixed(1) : 'N/A'}s`);
                }
            }
        }, 1000);
        
        console.log('✅ Monitoring started - check console for updates');
    },
    
    // Stop monitoring
    stopMonitoring: function() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            console.log('🛑 Montage monitoring stopped');
        }
    }
};

console.log('📋 Available commands:');
console.log('  window.montageTest.runAllTests() - Run all diagnostic tests');
console.log('  window.montageTest.startMonitoring() - Start monitoring montage transitions');
console.log('  window.montageTest.stopMonitoring() - Stop monitoring');
console.log('  window.montageTest.testCurrentState() - Test current state only'); 