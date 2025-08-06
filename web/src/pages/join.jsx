
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinPage() {
  // JoinPage component rendering
  
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // JoinPage hooks initialized
  
  useEffect(() => {
    // JoinPage useEffect triggered
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  if (isLoading) {
    return (
      <div style={{padding: '20px', textAlign: 'center', backgroundColor: 'orange', color: 'black'}}>
        <h2>🔄 JoinPage Loading...</h2>
        <p>This should be visible during loading</p>
        <p>Current URL: {window.location.href}</p>
      </div>
    );
  }

  return (
    <div style={{padding: '20px', textAlign: 'center', backgroundColor: 'red', color: 'white'}}>
      <h2>🚀 JoinPage Component Rendered!</h2>
      <p>This should be visible if the component is working</p>
      <p>Current URL: {window.location.href}</p>
      <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Error: {error || 'None'}</p>
      <button onClick={() => navigate('/')}>Go Home</button>
      <button onClick={() => navigate('/test')}>Go to Test</button>
    </div>
  );
}
