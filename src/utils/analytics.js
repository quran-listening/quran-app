import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = (measurementId) => {
  ReactGA.initialize(measurementId);
};

// Track page views
export const trackPageView = (page) => {
  ReactGA.send({ hitType: "pageview", page });
};

// Track custom events
export const trackEvent = (category, action, label) => {
  ReactGA.event({
    category,
    action,
    label,
  });
};

// Track user interactions
export const trackUserInteraction = (interactionType, interactionDetails) => {
  ReactGA.event({
    category: 'User Interaction',
    action: interactionType,
    label: JSON.stringify(interactionDetails),
  });
}; 