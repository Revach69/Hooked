import Layout from "./Layout.jsx";

import Home from "./Home";

import Consent from "./Consent";

import Discovery from "./Discovery";

import Matches from "./Matches";

import admin from "./admin";

import join from "./join";

import Profile from "./Profile";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Consent: Consent,
    
    Discovery: Discovery,
    
    Matches: Matches,
    
    admin: admin,
    
    join: join,
    
    Profile: Profile,
    
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
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Consent" element={<Consent />} />
                
                <Route path="/Discovery" element={<Discovery />} />
                
                <Route path="/Matches" element={<Matches />} />
                
                <Route path="/admin" element={<admin />} />
                
                <Route path="/join" element={<join />} />
                
                <Route path="/Profile" element={<Profile />} />
                
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