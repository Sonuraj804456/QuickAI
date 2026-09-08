const Footer = () => {
  return (
    <footer className="relative overflow-hidden px-6 md:px-16 lg:px-24 xl:px-32 w-full text-sm text-slate-500 bg-white pt-10">
      


      {/* Main Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-14">
        
        {/* Logo & Description */}
        <div className="sm:col-span-2 lg:col-span-1">
          <a href="/">
            <h1 className="text-xl font-bold text-gray-800">QuickAI</h1>
          </a>
          <p className="text-sm/7 mt-6">
            Experience the power of AI with QuickAi. <br />
            Transform your content creation with our suite of premium AI tools.
            Write articles, generate images, and enhance your workflow.
          </p>
        </div>

        {/* Company Links */}
        <div className="flex flex-col lg:items-center lg:justify-center">
          <div className="flex flex-col space-y-2.5">
            <h2 className="font-semibold mb-5 text-gray-800">Company</h2>
            <a className="hover:text-slate-600 transition" href="#">About us</a>
            <a className="hover:text-slate-600 transition" href="#">Careers</a>
            <a className="hover:text-slate-600 transition" href="#">Contact us</a>
            <a className="hover:text-slate-600 transition" href="#">Privacy policy</a>
          </div>
        </div>

        {/* Newsletter */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-5">
            Subscribe to our Quick.ai
          </h2>
          <div className="text-sm space-y-6 max-w-sm">
            <p>
              The latest news, articles, and resources, sent to your inbox weekly.
            </p>
            <div className="flex items-center">
              <input
                className="rounded-l-md bg-gray-100 outline-none w-full max-w-64 h-11 px-3"
                type="email"
                placeholder="Enter your email"
              />
              <button
                className="bg-gradient-to-b from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 transition px-4 h-11 text-white rounded-r-md"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-t mt-6 border-slate-200">
        <p className="text-center">
          Copyright 2025 © <span className="font-medium">Quick.ai</span>. All Rights Reserved.
        </p>
        <div className="flex items-center gap-4">
          <a href="/" className="hover:text-slate-700">Privacy Policy</a>
          <a href="/" className="hover:text-slate-700">Terms of Service</a>
          <a href="/" className="hover:text-slate-700">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
