import Header from "../../components/Header";

export default function Terms() {
  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-pink-400/90 to-purple-500/90 text-white py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Terms of Service
            </h1>
            <p className="text-xl max-w-3xl mx-auto">
              Please read these terms carefully before using our services.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="dark-mode-card rounded-lg shadow-sm p-8">
            <div className="prose prose-lg max-w-none dark-mode-text">
              <h2 className="text-2xl font-bold dark-mode-text mb-6">Terms of Service</h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                <strong>Last updated:</strong> January 1, 2025
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">1. Acceptance of Terms</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                By accessing and using Hooked (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">2. Description of Service</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Hooked is an event-based social networking platform that allows users to connect with other attendees at specific events. The service is designed for temporary use during events and automatically deletes user data when events conclude.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">3. User Eligibility</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You must be at least 18 years old to use our service. By using Hooked, you represent and warrant that you meet this age requirement.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">4. User Accounts and Profiles</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                When creating a profile, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Provide accurate and truthful information</li>
                <li>Maintain the security of your account</li>
                <li>Not share your account with others</li>
                <li>Not create multiple accounts for the same event</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">5. Acceptable Use</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You agree not to use the service to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Harass, abuse, or harm other users</li>
                <li>Share inappropriate or offensive content</li>
                <li>Impersonate others or provide false information</li>
                <li>Use the service for commercial purposes without permission</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">6. Data and Privacy</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">7. Event-Specific Terms</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Hooked is designed for event-specific use:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Profiles and data are automatically deleted when events end</li>
                <li>Each event requires a new profile creation</li>
                <li>Matches and conversations do not persist between events</li>
                <li>Event organizers may have additional terms specific to their events</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">8. Intellectual Property</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The service and its original content, features, and functionality are owned by Hooked and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">9. Termination</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">10. Limitation of Liability</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                In no event shall Hooked, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">11. Disclaimers</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Hooked makes no warranties, expressed or implied, and hereby disclaims all warranties, including without limitation, warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">12. Governing Law</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                These Terms shall be interpreted and governed by the laws of the jurisdiction in which Hooked operates, without regard to its conflict of law provisions.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">13. Changes to Terms</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">14. Contact Information</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 dark:bg-gray-600 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>Email:</strong> contact@hookedapp.com<br />
                  <strong>Phone:</strong> (+972) 53-2748672
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 