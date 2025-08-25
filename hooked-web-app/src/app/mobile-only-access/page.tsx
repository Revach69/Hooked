export default function MobileOnlyAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            📱 Mobile Only Access
          </h1>
          <p className="text-gray-600">
            This application is designed exclusively for mobile devices.
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            To access the Hooked app, please:
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
            <li>Visit this page on your mobile device</li>
            <li>Download the mobile app from your app store</li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <a 
            href="#" 
            className="inline-block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            📱 Download for iOS
          </a>
          <a 
            href="#" 
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            🤖 Download for Android
          </a>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          Hooked is optimized for the best mobile experience
        </p>
      </div>
    </div>
  );
}