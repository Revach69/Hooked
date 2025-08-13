import Header from "../../components/Header";

export default function Terms() {
  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white py-16 relative">
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
                <strong>Last updated:</strong> January 15, 2025
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">1. Acceptance of Terms</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                By accessing and using Hooked (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our service.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">2. Description of Service</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Hooked is an event-based social networking platform that allows users to connect with other attendees at specific events. The service is designed for temporary use during events and automatically deletes user data when events conclude. Our service includes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Event-based profile creation and management</li>
                <li>User discovery and matching features</li>
                <li>In-app messaging and communication</li>
                <li>Event-specific social networking</li>
                <li>Admin tools for event organizers</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">3. User Eligibility</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You must be at least 18 years old to use our service. By using Hooked, you represent and warrant that you meet this age requirement and have the legal capacity to enter into this agreement.
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
                <li>Use appropriate and respectful profile photos</li>
                <li>Keep your profile information up to date</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">5. Acceptable Use and Content Guidelines</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You agree not to use the service to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Harass, abuse, bully, or harm other users</li>
                <li>Share inappropriate, offensive, or explicit content</li>
                <li>Impersonate others or provide false information</li>
                <li>Use the service for commercial purposes without permission</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Share personal information of other users without consent</li>
                <li>Use automated systems or bots to interact with the service</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Share content that promotes hate speech or discrimination</li>
                <li>Use the service for dating or romantic purposes outside of event context</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">6. Content Moderation and Safety</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We are committed to maintaining a safe and respectful environment:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>We reserve the right to review and moderate all content</li>
                <li>Users can report inappropriate behavior or content</li>
                <li>We may remove content or suspend accounts for violations</li>
                <li>Profile photos must be appropriate and non-explicit</li>
                <li>Messages must be respectful and non-harassing</li>
                <li>We do not tolerate hate speech, discrimination, or harassment</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">7. User Safety and Reporting</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your safety is important to us:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Report any inappropriate behavior or content immediately</li>
                <li>Do not share personal contact information with strangers</li>
                <li>Meet in public places if you choose to meet someone from the app</li>
                <li>Trust your instincts and report suspicious behavior</li>
                <li>We will investigate all reports and take appropriate action</li>
                <li>Contact local authorities if you feel unsafe or threatened</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">8. Data and Privacy</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, to understand our practices regarding data collection, use, and retention.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">9. Third-Party Services</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our service uses third-party services including Firebase, Sentry, and Expo. These services have their own terms of service and privacy policies. By using our service, you acknowledge that these third-party services may process your data in accordance with their respective policies.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">10. Event-Specific Terms</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Hooked is designed for event-specific use:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Profiles and data are automatically deleted within 24 hours when events end</li>
                <li>Each event requires a new profile creation</li>
                <li>Matches and conversations do not persist between events</li>
                <li>Event organizers may have additional terms specific to their events</li>
                <li>Event codes are provided by event organizers and are event-specific</li>
                <li>You must have a valid event code to participate in an event</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">11. Intellectual Property</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The service and its original content, features, and functionality are owned by Hooked and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You retain ownership of content you create, but grant us a license to use it for service provision.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">12. Termination</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties. Upon termination, your right to use the service will cease immediately.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">13. Limitation of Liability</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                In no event shall Hooked, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">14. Disclaimers</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Hooked makes no warranties, expressed or implied, and hereby disclaims all warranties, including without limitation, warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the service will be uninterrupted or error-free.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">15. Indemnification</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You agree to indemnify and hold harmless Hooked and its affiliates from any claims, damages, losses, or expenses arising from your use of the service or violation of these terms.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">16. Governing Law and Dispute Resolution</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                These Terms shall be interpreted and governed by the laws of the jurisdiction in which Hooked operates, without regard to its conflict of law provisions. Any disputes arising from these terms or your use of the service shall be resolved through binding arbitration or in the courts of our jurisdiction.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">17. Severability</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">18. Changes to Terms</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. Your continued use of the service after changes become effective constitutes acceptance of the new terms.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">19. Contact Information</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 dark:bg-gray-600 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>Email:</strong> contact@hookedapp.com<br />
                  <strong>Phone:</strong> (+972) 53-2748672<br />
                </p>
              </div>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">20. Terms of Service Version History</h3>
              <div className="bg-gray-50 dark:bg-gray-600 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  <strong>Version 2.0 - January 15, 2025:</strong>
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                  <li>Added content moderation and safety guidelines</li>
                  <li>Enhanced acceptable use policies</li>
                  <li>Added user safety and reporting procedures</li>
                  <li>Added third-party services disclosure</li>
                  <li>Enhanced event-specific terms</li>
                  <li>Added indemnification clause</li>
                  <li>Improved dispute resolution section</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  <strong>Version 1.0 - January 1, 2025:</strong>
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300">
                  <li>Initial terms of service</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 