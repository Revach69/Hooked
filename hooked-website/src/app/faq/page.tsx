'use client';

import Header from '../../components/Header';

export default function FAQ() {
  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl max-w-3xl mx-auto">
              Everything you need to know about bringing Hooked to your event
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 dark-mode-middle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="dark-mode-card border dark-mode-border rounded-lg p-6">
              <h3 className="text-lg font-semibold dark-mode-text mb-2">
                How much does it cost to use Hooked at my event?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Pricing varies based on event size and type. Contact us for a custom quote tailored to your specific needs.
              </p>
            </div>
            
            <div className="dark-mode-card border dark-mode-border rounded-lg p-6">
              <h3 className="text-lg font-semibold dark-mode-text mb-2">
                How far in advance should I book Hooked for my event?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We recommend booking at least 2-3 weeks in advance to ensure we can provide the best setup and support for your event.
              </p>
            </div>
            
            <div className="dark-mode-card border dark-mode-border rounded-lg p-6">
              <h3 className="text-lg font-semibold dark-mode-text mb-2">
                What kind of support do you provide during the event?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We provide 24/7 technical support during your event, including on-site assistance if needed for larger events.
              </p>
            </div>
            
            <div className="dark-mode-card border dark-mode-border rounded-lg p-6">
              <h3 className="text-lg font-semibold dark-mode-text mb-2">
                Can I customize the branding for my event?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! We can customize the QR codes and event space with your branding and colors to match your event theme.
              </p>
            </div>
            
            <div className="dark-mode-card border dark-mode-border rounded-lg p-6">
              <h3 className="text-lg font-semibold dark-mode-text mb-2">
                What happens to the data after the event ends?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                All profiles and chat data are automatically deleted when the event ends. We don&apos;t store any personal information permanently.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 