import React from 'react';
import { useResponsive } from '../utils/useResponsive';

function TestComponent() {
    const responsiveProps = useResponsive();
    console.log('responsiveProps',responsiveProps);

    return <div>Test Component</div>;
}

export default TestComponent;