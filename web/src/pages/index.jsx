import Layout from "./Layout.jsx";

import Home from "./Home";

import Consent from "./Consent";

import Discovery from "./Discovery";

import Matches from "./Matches";

import Join from "./join.jsx";

import Profile from "./Profile";

import Survey from "./Survey";

import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

// Test component for debugging
const TestComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log("🔍 TestComponent rendered");
  console.log("🔍 TestComponent location:", location.pathname);
  console.log("🔍 TestComponent navigate function:", typeof navigate);
  console.log("🔍 TestComponent full location:", location);
  
  return (
    <div style={{padding: '20px', textAlign: 'center', backgroundColor: 'yellow'}}>
      <h2>🧪 Test Component - Router Working!</h2>
      <p>✅ Router is working!</p>
      <p>Current path: {location.pathname}</p>
      <p>Current search: {location.search}</p>
      <p>Navigate function: {typeof navigate}</p>
      <button onClick={() => navigate('/')}>Go Home</button>
      <button onClick={() => navigate('/join?code=TEST')}>Go to Join</button>
      <button onClick={() => window.location.href = '/join?code=TEST'}>Force Reload to Join</button>
    </div>
  );
};

const PAGES = {
    
    Home: Home,
    
    Consent: Consent,
    
    Discovery: Discovery,
    
    Matches: Matches,
    
    join: Join,
    
    Profile: Profile,
    
    Survey: Survey,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPage = _getCurrentPage(location.pathname);
    
    console.log("🔍 PagesContent - Current location:", location.pathname);
    console.log("🔍 PagesContent - Current search:", location.search);
    console.log("🔍 PagesContent - Current page:", currentPage);
    console.log("🔍 PagesContent - navigate function type:", typeof navigate);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Home />} />
                <Route path="/Home" element={<Home />} />
                <Route path="/Consent" element={<Consent />} />
                <Route path="/Discovery" element={<Discovery />} />
                <Route path="/Matches" element={<Matches />} />
                <Route path="/join" element={
                  (() => {
                    console.log("🔍 Join route matched - rendering Join component");
                    console.log("🔍 Join component type:", typeof Join);
                    console.log("🔍 Join component:", Join);
                    return <Join />;
                  })()
                } />
                <Route path="/Profile" element={<Profile />} />
                <Route path="/Survey" element={<Survey />} />
                <Route path="/test" element={<TestComponent />} />
                
                {/* Catch-all route for debugging */}
                <Route path="*" element={
                  (() => {
                    console.log("🔍 Catch-all route matched - path:", location.pathname);
                    return (
                      <div style={{padding: '20px', textAlign: 'center'}}>
                        <h2>404 - Page Not Found</h2>
                        <p>Current path: {location.pathname}</p>
                        <p>Current search: {location.search}</p>
                        <p>Current hash: {location.hash}</p>
                        <p>Navigate function: {typeof navigate}</p>
                        <button onClick={() => navigate('/')}>Go Home</button>
                      </div>
                    );
                  })()
                } />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}