
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinPage() {
  console.log("🚀 JoinPage component - STARTING TO RENDER");
  console.log("🚀 JoinPage component - Current URL:", window.location.href);
  console.log("🚀 JoinPage component - Current pathname:", window.location.pathname);
  console.log("🚀 JoinPage component - Current search:", window.location.search);
  
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  console.log("🚀 JoinPage component - Hooks initialized successfully");
  
  useEffect(() => {
    console.log("🚀 JoinPage useEffect triggered");
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
