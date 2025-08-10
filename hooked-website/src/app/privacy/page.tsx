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
                <strong>Last updated:</strong> January 1, 2025
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
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">3. Data Retention and Deletion</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                <strong>Event Data:</strong> All profiles and chat data are automatically deleted when the event ends. We do not store this information permanently.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                <strong>Account Data:</strong> If you create an account, we retain your information until you delete your account or request deletion.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">4. Information Sharing</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We do not sell, trade, or otherwise transfer your personal information to third parties except:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist in our operations</li>
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">5. Data Security</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>

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
              </ul>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">7. Cookies and Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We use cookies and similar technologies to improve your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">8. Third-Party Services</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">9. Children&apos;s Privacy</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Our services are not intended for children under 18. We do not knowingly collect personal information from children under 18.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">10. Changes to This Policy</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on our website.
              </p>

              <h3 className="text-xl font-semibold dark-mode-text mb-4">11. Contact Us</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If you have any questions about this privacy policy or our data practices, please contact us at:
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