import Header from "../../components/Header";

export default function Privacy() {
  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl max-w-3xl mx-auto">
              Your privacy is important to us. Learn how we protect your data and ensure your information stays secure.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="dark-mode-card rounded-lg shadow-sm p-8">
            <div className="prose prose-lg max-w-none dark-mode-text">
              <h2 className="text-2xl font-bold dark-mode-text mb-6">Privacy Policy</h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                <strong>Last updated:</strong> January 15, 2025
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">1. Information We Collect</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We collect information you provide directly to us, such as when you create a profile, participate in events, or contact us for support. This may include:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Name and contact information</li>
                <li>Profile information and photos</li>
                <li>Event participation data</li>
                <li>Communication preferences</li>
                <li>Age and gender identity (for matching purposes)</li>
                <li>Interests and preferences</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">2. How We Use Your Information</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Provide and maintain our services</li>
                <li>Facilitate connections at events</li>
                <li>Send you important updates and notifications</li>
                <li>Improve our platform and user experience</li>
                <li>Ensure the security of our services</li>
                <li>Provide customer support</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">3. Data Retention and Deletion</h3>
              
              <h4 className="text-lg font-semibold dark-mode-text mb-3">Event Data</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>User Profiles:</strong> All user profiles, photos, and personal information are automatically deleted within 24 hours after the event ends.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Chat Messages:</strong> All chat messages and conversations are permanently deleted within 24 hours after the event ends.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Match Data:</strong> Like/match information is deleted within 24 hours after the event ends.
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Backup and Recovery Data</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Backup Retention:</strong> Any backup copies of event data are retained for a maximum of 7 days for disaster recovery purposes, after which they are permanently deleted.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>System Logs:</strong> Technical logs and system data are retained for up to 30 days for security and debugging purposes.
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Analytics and Usage Data</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Aggregated Analytics:</strong> Anonymous, aggregated usage statistics are retained for up to 2 years to improve our services. This data cannot be used to identify individual users.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Performance Metrics:</strong> App performance and error data are retained for up to 90 days for service improvement.
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Admin and Business Data</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Event Information:</strong> Event details, locations, and administrative information are retained for up to 3 years for business records and legal compliance.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Client Information:</strong> Business client contact information and event history are retained for up to 5 years for business relationship management.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Admin Accounts:</strong> Administrator account information is retained until the account is deleted or the administrator requests deletion.
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Legal Compliance and Data Retention</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Legal Requirements:</strong> We may retain certain data for longer periods when required by law, regulation, or legal proceedings.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>GDPR Compliance:</strong> Under GDPR, you have the right to request deletion of your personal data. We will process deletion requests within 30 days.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>CCPA Compliance:</strong> California residents have the right to know what personal information is collected and request deletion. We will respond to CCPA requests within 45 days.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                <strong>Data Subject Rights:</strong> You may request information about your data, request corrections, or request deletion by contacting us at contact@hookedapp.com.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">4. Information Sharing</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We do not sell, trade, or otherwise transfer your personal information to third parties except:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist in our operations (see Third-Party Services section)</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">5. Data Security</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>SSL/TLS encryption for all data transmission</li>
                <li>Encryption of data at rest</li>
                <li>Regular security audits and assessments</li>
                <li>Access controls and authentication measures</li>
                <li>Secure data centers and infrastructure</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">6. Your Rights</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your data</li>
                <li>Opt out of certain communications</li>
                <li>Lodge a complaint with supervisory authorities</li>
                <li>Data portability (receive your data in a structured format)</li>
                <li>Object to processing of your data</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">7. Cookies and Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We use cookies and similar technologies to improve your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">8. Third-Party Services and Data Processors</h3>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our app uses the following third-party services to provide our functionality. Each service has its own privacy policy and data handling practices:
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Firebase (Google LLC)</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use Firebase services for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li><strong>Authentication:</strong> User login and account management</li>
                <li><strong>Firestore Database:</strong> Storage of event data, user profiles, and messages</li>
                <li><strong>Cloud Storage:</strong> Storage of user profile photos</li>
                <li><strong>Cloud Functions:</strong> Backend processing and automation</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Firebase&apos;s privacy policy can be found at: <a href="https://firebase.google.com/support/privacy" className="text-purple-600 underline" target="_blank" rel="noopener noreferrer">https://firebase.google.com/support/privacy</a>
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Sentry (Functional Software, Inc.)</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use Sentry for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li><strong>Error Monitoring:</strong> Tracking and fixing app crashes and errors</li>
                <li><strong>Performance Monitoring:</strong> Monitoring app performance and user experience</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Sentry&apos;s privacy policy can be found at: <a href="https://sentry.io/privacy/" className="text-purple-600 underline" target="_blank" rel="noopener noreferrer">https://sentry.io/privacy/</a>
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Expo (Expo, Inc.)</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use Expo services for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                <li><strong>App Development:</strong> Cross-platform app development framework</li>
                <li><strong>Push Notifications:</strong> Sending notifications to users</li>
                <li><strong>Image Picker:</strong> Camera and photo library access</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Expo&apos;s privacy policy can be found at: <a href="https://expo.dev/privacy" className="text-purple-600 underline" target="_blank" rel="noopener noreferrer">https://expo.dev/privacy</a>
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Data Processing Agreements</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We have data processing agreements with these third-party services to ensure they handle your data in compliance with applicable privacy laws and our privacy standards.
              </p>

              <h4 className="text-lg font-semibold dark-mode-text mb-3">Third-Party Websites</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">9. Children&apos;s Privacy</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our services are not intended for children under 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">10. International Data Transfers</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and that your data receives adequate protection.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">11. Changes to This Policy</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the &quot;Last updated&quot; date. We encourage you to review this policy periodically.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">12. Contact Us</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If you have any questions about this privacy policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-50 dark:bg-gray-600 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">
                  <strong>Email:</strong> contact@hookedapp.com<br />
                  <strong>Phone:</strong> (+972) 53-2748672<br />
                </p>
              </div>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">13. Privacy Policy Version History</h3>
              <div className="bg-gray-50 dark:bg-gray-600 p-4 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  <strong>Version 2.0 - January 15, 2025:</strong>
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4">
                  <li>Added detailed data retention timeframes</li>
                  <li>Added third-party service disclosures</li>
                  <li>Added GDPR and CCPA compliance information</li>
                  <li>Added data processing and security measures</li>
                  <li>Enhanced user rights and data subject rights</li>
                  <li>Added international data transfers section</li>
                </ul>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  <strong>Version 1.0 - January 1, 2025:</strong>
                </p>
                <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300">
                  <li>Initial privacy policy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 